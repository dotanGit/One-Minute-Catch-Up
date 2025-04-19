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
    history: category && category !== 'history' ? [] : (combinedData.history || []).filter(e => isInRange(e.timestamp)),
    drive: {
      files: category && category !== 'drive' ? [] : (combinedData.drive?.files || []).filter(f => isInRange(f.modifiedTime))
    },
    emails: {
      all: category && category !== 'emails' ? [] : (combinedData.emails?.all || []).filter(e => isInRange(e.timestamp))
    },
    calendar: {
      today: category && category !== 'calendar' ? [] : (combinedData.calendar?.today || []).filter(e => isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date))),
      tomorrow: category && category !== 'calendar' ? [] : (combinedData.calendar?.tomorrow || []).filter(e => isInRange(safeGetTimestamp(e.start?.dateTime || e.start?.date)))
    },
    downloads: category && category !== 'downloads' ? [] : (combinedData.downloads || []).filter(d => isInRange(d.startTime))
  };
}

// === UI Setup ===
export async function initTimelineFilterUI(onFilterChange) {
  const filterMenu = document.querySelector('.filter-menu');
  const mainButton = document.getElementById('filter-button');
  const datePicker = document.getElementById('date-picker');
  const dateFilter = document.getElementById('date-filter');

  // Toggle expansion
  mainButton.addEventListener('click', () => {
    filterMenu.classList.toggle('active');
    mainButton.classList.toggle('rotated');
    datePicker.classList.add('hidden');
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

  dateFilter.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (selected) {
      const start = new Date(selected);
      timelineFilters.startDate = start;
      timelineFilters.endDate = new Date(start.getTime() + 86400000 - 1);
    } else {
      timelineFilters.startDate = null;
      timelineFilters.endDate = null;
    }
    onFilterChange();
  });

  document.querySelectorAll('.expanded-filter-buttons .filter-button').forEach(button => {
    button.addEventListener('click', () => {
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
}


document.addEventListener('click', (e) => {
  const datePicker = document.getElementById('date-picker');
  const timeBtn = document.querySelector('.filter-button[data-category="time"]');
  if (!datePicker.contains(e.target) && !timeBtn.contains(e.target)) {
    datePicker.classList.add('hidden');
  }
});
