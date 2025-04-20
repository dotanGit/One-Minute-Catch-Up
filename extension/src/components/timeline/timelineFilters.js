// timelineFilters.js
import { safeGetTimestamp } from '../../utils/dateUtils.js';

// === Filter State ===
export const timelineFilters = {
  category: null,
  startDate: null,
  endDate: null
};

// === Apply Filters ===
export function applyTimelineFilters(combinedData, { category = null, startDate = null, endDate = null }) {
  const isInRange = (timestamp) =>
    (!startDate || timestamp >= startDate.getTime()) &&
    (!endDate || timestamp <= endDate.getTime());

    return {
      history: category && category !== 'history' ? [] :
        (combinedData.history || []).filter(e => isInRange(safeGetTimestamp(e.timestamp))),
    
      drive: {
        files: category && category !== 'drive' ? [] :
          (combinedData.drive?.files || []).filter(f => isInRange(safeGetTimestamp(f.modifiedTime)))
      },
    
      emails: {
        all: category && category !== 'emails' ? [] :
          (combinedData.emails?.all || []).filter(e => isInRange(safeGetTimestamp(e.timestamp)))
      },
    
      calendar: {
        today: category && category !== 'calendar' ? [] :
          (combinedData.calendar?.today || []).filter(e =>
            isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date))
          ),
        tomorrow: category && category !== 'calendar' ? [] :
          (combinedData.calendar?.tomorrow || []).filter(e =>
            isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date))
          )
      },
    
      downloads: category && category !== 'downloads' ? [] :
        (combinedData.downloads || []).filter(d => isInRange(safeGetTimestamp(d.startTime)))
    };
}

// === UI Setup ===
export async function initTimelineFilterUI(onFilterChange) {
  console.log('[DEBUG] 🛠 initTimelineFilterUI is running');
  const filterMenu = document.querySelector('.filter-menu');
  const mainButton = document.getElementById('filter-button');
  const datePicker = document.getElementById('date-picker');
  const dateFilter = document.getElementById('date-filter');

  // Toggle expansion when clicking main button
  mainButton.addEventListener('click', (e) => {
    console.log('[DEBUG] ✅ filter-button click triggered');
    e.stopPropagation(); // prevent window click from closing immediately
    const isActive = filterMenu.classList.toggle('active');
    mainButton.classList.toggle('rotated', isActive);
    if (!isActive) datePicker.classList.add('hidden');
  });

  // Populate date dropdown
  const result = await chrome.storage.local.get(null);
  const dateSet = new Set();
  for (const key of Object.keys(result)) {
    if (key.startsWith('timeline_')) {
      const date = key.split('_')[1];
      if (date) dateSet.add(date);
    }
  }

  dateFilter.innerHTML = `<option value="">All Dates</option>`;
  [...dateSet].sort().forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    dateFilter.appendChild(option);
  });

  // Filter on date selection
  dateFilter.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (selected) {
      const start = new Date(selected);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
    
      timelineFilters.startDate = start;
      timelineFilters.endDate = end;
    } else {
      timelineFilters.startDate = null;
      timelineFilters.endDate = null;
    }
    onFilterChange();
  });

  // Handle category button clicks
  document.querySelectorAll('.expanded-filter-buttons .filter-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // avoid outside click close
      const category = button.dataset.category;
      if (category === 'time') {
        datePicker.classList.toggle('hidden');
      } else {
        timelineFilters.category = category;
        datePicker.classList.add('hidden');
        onFilterChange();
      }
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
