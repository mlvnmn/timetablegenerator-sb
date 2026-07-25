// ─── Days & Periods ────────────────────────────────────────────────────────────
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── Preset class list (used by Step 1 "Load Defaults" button only) ───────────
// Schema: { id, label, periodsPerDay }  — no year/batch/type needed any more.
export const PRESET_CLASSES = [
  { id: 'UG-1A', label: 'UG 1st Year – Batch A', periodsPerDay: 6 },
  { id: 'UG-1B', label: 'UG 1st Year – Batch B', periodsPerDay: 6 },
  { id: 'UG-2A', label: 'UG 2nd Year – Batch A', periodsPerDay: 5 },
  { id: 'UG-2B', label: 'UG 2nd Year – Batch B', periodsPerDay: 5 },
  { id: 'UG-3A', label: 'UG 3rd Year – Batch A', periodsPerDay: 5 },
  { id: 'UG-3B', label: 'UG 3rd Year – Batch B', periodsPerDay: 5 },
  { id: 'PG-1',  label: 'PG 1st Year',           periodsPerDay: 5 },
  { id: 'PG-2',  label: 'PG 2nd Year',           periodsPerDay: 5 },
];

// ─── Period Time Slots ─────────────────────────────────────────────────────────
export const PERIOD_TIMES = [
  '8:00 – 9:00',
  '9:00 – 10:00',
  '10:00 – 11:00',
  '11:00 – 12:00',
  '12:00 – 1:00',
  '1:00 – 2:00',
];

// ─── Teacher Color Palette (Pastels matching Datewise style) ───────────────────
export const TEACHER_COLORS = [
  { bg: 'bg-emerald-50/70',  text: 'text-emerald-800',  border: 'border-emerald-200/60',  indicator: 'bg-emerald-500' },
  { bg: 'bg-orange-50/70',   text: 'text-orange-800',   border: 'border-orange-200/60',   indicator: 'bg-orange-500' },
  { bg: 'bg-rose-50/70',     text: 'text-rose-800',     border: 'border-rose-200/60',     indicator: 'bg-rose-500' },
  { bg: 'bg-indigo-50/70',   text: 'text-indigo-800',   border: 'border-indigo-200/60',   indicator: 'bg-indigo-500' },
  { bg: 'bg-blue-50/70',     text: 'text-blue-800',     border: 'border-blue-200/60',     indicator: 'bg-blue-500' },
  { bg: 'bg-amber-50/80',    text: 'text-amber-800',    border: 'border-amber-200/60',    indicator: 'bg-amber-500' },
  { bg: 'bg-teal-50/70',     text: 'text-teal-800',     border: 'border-teal-200/60',     indicator: 'bg-teal-500' },
  { bg: 'bg-fuchsia-50/70',  text: 'text-fuchsia-800',  border: 'border-fuchsia-200/60',  indicator: 'bg-fuchsia-500' },
  { bg: 'bg-violet-50/70',   text: 'text-violet-800',   border: 'border-violet-200/60',   indicator: 'bg-violet-500' },
  { bg: 'bg-sky-50/70',      text: 'text-sky-800',      border: 'border-sky-200/60',      indicator: 'bg-sky-500' },
  { bg: 'bg-pink-50/70',     text: 'text-pink-800',     border: 'border-pink-200/60',     indicator: 'bg-pink-500' },
  { bg: 'bg-cyan-50/70',     text: 'text-cyan-800',     border: 'border-cyan-200/60',     indicator: 'bg-cyan-500' },
];

// ─── Common CS Subjects ────────────────────────────────────────────────────────
export const COMMON_SUBJECTS = [
  'Data Structures', 'Algorithms', 'Operating Systems', 'Database Management',
  'Computer Networks', 'Software Engineering', 'Theory of Computation',
  'Compiler Design', 'Artificial Intelligence', 'Machine Learning',
  'Web Technologies', 'Computer Graphics', 'Discrete Mathematics',
  'Linear Algebra', 'Probability & Statistics', 'Digital Logic',
  'Computer Architecture', 'Object Oriented Programming', 'Python Programming',
  'Java Programming', 'C Programming', 'Advanced Algorithms', 'Cloud Computing',
  'Cyber Security', 'Big Data Analytics', 'Deep Learning', 'Natural Language Processing',
  'Distributed Systems', 'Mobile Application Development', 'Embedded Systems',
];
