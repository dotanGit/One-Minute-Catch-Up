// timelineFilters.js
import { safeGetTimestamp } from '../../utils/dateUtils.js';

// === Filter State ===
export const timelineFilters = {
  category: new Set(),
  startDate: null,
  endDate: null
};

// === Apply Filters ===
export function applyTimelineFilters(combinedData, { category = new Set(), startDate = null, endDate = null }) {
  const isInRange = (timestamp) =>
    (!startDate || timestamp >= startDate.getTime()) &&
    (!endDate || timestamp <= endDate.getTime());

  const include = (type) => category.size === 0 || category.has(type);

  return {
    history: include('history') ?
      (combinedData.history || []).filter(e => isInRange(safeGetTimestamp(e.timestamp))) : [],

    drive: {
      files: include('drive') ?
        (combinedData.drive?.files || []).filter(f => isInRange(safeGetTimestamp(f.modifiedTime))) : []
    },

    emails: {
      all: include('emails') ?
        (combinedData.emails?.all || []).filter(e => isInRange(safeGetTimestamp(e.timestamp))) : []
    },

    calendar: {
      today: include('calendar') ?
        (combinedData.calendar?.today || []).filter(e =>
          isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date))
        ) : [],
      tomorrow: include('calendar') ?
        (combinedData.calendar?.tomorrow || []).filter(e =>
          isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date))
        ) : []
    },

    downloads: include('downloads') ?
      (combinedData.downloads || []).filter(d => isInRange(safeGetTimestamp(d.startTime))) : []
  };
}

// === UI Setup ===
export async function initTimelineFilterUI(onFilterChange) {
  console.log('[DEBUG] 🛠 initTimelineFilterUI is running');
  const filterMenu = document.querySelector('.filter-menu');
  const mainButton = document.getElementById('filter-button');
  const datePicker = document.getElementById('date-picker');
  const customSelect = datePicker.querySelector('.custom-select');
  const selectedText = customSelect.querySelector('.select-selected');
  const optionsContainer = customSelect.querySelector('.select-options');

  // Populate date options
  const result = await chrome.storage.local.get(null);
  const dateSet = new Set();
  for (const key of Object.keys(result)) {
    if (key.startsWith('timeline_')) {
      const date = key.split('_')[1];
      if (date) dateSet.add(date);
    }
  }

  // Add "All Dates" option
  const allDatesOption = document.createElement('div');
  allDatesOption.className = 'select-option';
  allDatesOption.textContent = 'All Dates';
  allDatesOption.addEventListener('click', () => {
    selectedText.textContent = 'All Dates';
    timelineFilters.startDate = null;
    timelineFilters.endDate = null;
    optionsContainer.classList.remove('active');
    selectedText.classList.remove('active');
    onFilterChange();
  });
  optionsContainer.appendChild(allDatesOption);

  // Add date options
  [...dateSet].sort().forEach(date => {
    const option = document.createElement('div');
    option.className = 'select-option';
    option.textContent = date;
    option.addEventListener('click', () => {
      selectedText.textContent = date;
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      
      timelineFilters.startDate = start;
      timelineFilters.endDate = end;
      optionsContainer.classList.remove('active');
      selectedText.classList.remove('active');
      onFilterChange();
    });
    optionsContainer.appendChild(option);
  });

  // Toggle dropdown
  selectedText.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedText.classList.toggle('active');
    optionsContainer.classList.toggle('active');
  });

  // Toggle expansion when clicking main button
  mainButton.addEventListener('click', (e) => {
    console.log('[DEBUG] ✅ filter-button click triggered');
    e.stopPropagation(); // prevent window click from closing immediately
    const isActive = filterMenu.classList.toggle('active');
    mainButton.classList.toggle('rotated', isActive);
    if (!isActive) datePicker.classList.add('hidden');
  });

  // Handle category button clicks
  document.querySelectorAll('.expanded-filter-buttons .filter-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const category = button.dataset.category;
  
      if (category === 'time') {
        datePicker.classList.toggle('hidden');
        return;
      }
  
      // Toggle selection in the Set
      if (timelineFilters.category.has(category)) {
        timelineFilters.category.delete(category);
        button.classList.remove('selected'); // optional styling
      } else {
        timelineFilters.category.add(category);
        button.classList.add('selected'); // optional styling
      }
  
      datePicker.classList.add('hidden');
      onFilterChange();
    });
  });

  // Click outside to close everything
  document.addEventListener('click', (e) => {
    const filterMenu = document.querySelector('.filter-menu');
    const mainButton = document.getElementById('filter-button');
    const datePicker = document.getElementById('date-picker');
  
    if (!filterMenu.contains(e.target)) {
      // Start reverse animation
      const buttons = document.querySelectorAll('.expanded-filter-buttons .filter-button');
      buttons.forEach((btn, index) => {
        btn.style.transitionDelay = `${(buttons.length - index - 1) * 0.05}s`;
      });
  
      filterMenu.classList.remove('active');
      mainButton.classList.remove('rotated');
      
      // Reset instantly, no delay
      buttons.forEach((btn) => {
        btn.style.transitionDelay = '0s';
      });
  
      datePicker.classList.add('hidden');
    }
  });
}
