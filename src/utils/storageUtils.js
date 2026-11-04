/**
 * LocalStorage Persistence Utilities
 * Automatically saves and restores classes, subjects, faculty, constraints,
 * and generated timetables across browser refreshes and sessions.
 */

export const STORAGE_KEYS = {
  CLASSES: 'tt_classes_data_v1',
  SUBJECTS: 'tt_subjects_data_v1',
  TEACHERS: 'tt_teachers_data_v1',
  TIMETABLE: 'tt_timetable_data_v1',
  CURRENT_STEP: 'tt_current_step_v1',
  COMPLETED_STEPS: 'tt_completed_steps_v1',
};

export function loadStoredItem(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (err) {
    console.warn(`[Storage] Failed to read ${key} from localStorage:`, err);
    return fallback;
  }
}

export function saveStoredItem(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined || value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn(`[Storage] Failed to save ${key} to localStorage:`, err);
  }
}

export function clearAllStoredData() {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach(k => {
      window.localStorage.removeItem(k);
    });
  } catch (err) {
    console.warn('[Storage] Failed to clear localStorage keys:', err);
  }
}
