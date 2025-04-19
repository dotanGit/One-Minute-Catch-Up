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
  const filterButton = document.getElementById('filter-button');
  const filterDropdown = document.getElementById('filter-dropdown');
  const categoryFilter = document.getElementById('category-filter');
  const dateFilter = document.getElementById('date-filter');

  // Toggle filter dropdown
  filterButton.addEventListener('click', () => {
    filterDropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!filterButton.contains(e.target) && !filterDropdown.contains(e.target)) {
      filterDropdown.classList.remove('show');
    }
  });

  const result = await chrome.storage.local.get(null);
  const categorySet = new Set();
  const dateSet = new Set();

  for (const key of Object.keys(result)) {
    if (!key.startsWith('timeline_')) continue;
    const dateStr = key.split('_')[1];
    if (dateStr) dateSet.add(dateStr);

    const data = result[key]?.data;
    if (!data) continue;

    if ((data.history || []).length) categorySet.add('history');
    if ((data.drive?.files || []).length) categorySet.add('drive');
    if ((data.emails?.all || []).length) categorySet.add('emails');
    if ((data.calendar?.today || []).length || (data.calendar?.tomorrow || []).length) categorySet.add('calendar');
    if ((data.downloads || []).length) categorySet.add('downloads');
  }

  // Populate categories
  categoryFilter.innerHTML = `<option value="">All Categories</option>`;
  [...categorySet].sort().forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    categoryFilter.appendChild(option);
  });

  // Populate dates
  dateFilter.innerHTML = `<option value="">All Dates</option>`;
  [...dateSet].sort().forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    dateFilter.appendChild(option);
  });

  // Handle changes
  categoryFilter.addEventListener('change', (e) => {
    timelineFilters.category = e.target.value || null;
    onFilterChange();
  });

  dateFilter.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (selected) {
      const date = new Date(selected);
      timelineFilters.startDate = date;
      timelineFilters.endDate = new Date(date.getTime() + 86400000 - 1);
    } else {
      timelineFilters.startDate = null;
      timelineFilters.endDate = null;
    }
    onFilterChange();
  });
}
