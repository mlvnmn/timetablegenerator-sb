import * as XLSX from 'xlsx';
import { DAYS, PERIOD_TIMES } from '../constants';

/**
 * Download a sample Excel configuration template for users to fill in.
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Classes Sheet
  const classesData = [
    { 'Class ID': 'UG-1A', 'Class Label': 'UG 1st Year – Batch A', 'Periods Per Day': 6 },
    { 'Class ID': 'UG-1B', 'Class Label': 'UG 1st Year – Batch B', 'Periods Per Day': 6 },
    { 'Class ID': 'UG-2A', 'Class Label': 'UG 2nd Year – Batch A', 'Periods Per Day': 5 },
    { 'Class ID': 'PG-1',  'Class Label': 'PG 1st Year',           'Periods Per Day': 5 },
  ];
  const wsClasses = XLSX.utils.json_to_sheet(classesData);
  wsClasses['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 18 }];

  // 2. Subjects Sheet
  const subjectsData = [
    { 'Class ID': 'UG-1A', 'Subject Name': 'Data Structures',       'Hours Per Week': 4, 'Is Elective': 'No',  'Elective Group': '' },
    { 'Class ID': 'UG-1A', 'Subject Name': 'Digital Logic',          'Hours Per Week': 3, 'Is Elective': 'No',  'Elective Group': '' },
    { 'Class ID': 'UG-1A', 'Subject Name': 'AI Elective',            'Hours Per Week': 2, 'Is Elective': 'Yes', 'Elective Group': 'Elec-1' },
    { 'Class ID': 'UG-1B', 'Subject Name': 'Data Structures',       'Hours Per Week': 4, 'Is Elective': 'No',  'Elective Group': '' },
    { 'Class ID': 'UG-1B', 'Subject Name': 'ML Elective',            'Hours Per Week': 2, 'Is Elective': 'Yes', 'Elective Group': 'Elec-1' },
  ];
  const wsSubjects = XLSX.utils.json_to_sheet(subjectsData);
  wsSubjects['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

  // 3. Teachers Sheet
  const teachersData = [
    {
      'Teacher ID': 't1',
      'Teacher Name': 'Dr. Alan Turing',
      'Subject': 'Data Structures',
      'Class ID': 'UG-1A',
      'Hours Per Week': 4,
      'Is Elective': 'No',
      'Elective Group': '',
      'Blocked Slots (Day:Period)': '',
    },
    {
      'Teacher ID': 't2',
      'Teacher Name': 'Prof. Grace Hopper',
      'Subject': 'Digital Logic',
      'Class ID': 'UG-1A',
      'Hours Per Week': 3,
      'Is Elective': 'No',
      'Elective Group': '',
      'Blocked Slots (Day:Period)': 'Monday:1, Friday:5',
    },
  ];
  const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
  wsTeachers['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, wsClasses,  'Classes');
  XLSX.utils.book_append_sheet(wb, wsSubjects, 'Subjects');
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Teachers');

  XLSX.writeFile(wb, 'Timetable_Config_Template.xlsx');
}

/**
 * Export generated timetables & config to a multi-tab Excel workbook (.xlsx).
 */
export function exportToExcel({ classes, subjects, teachers, timetable }) {
  const wb = XLSX.utils.book_new();

  // ── 1. Summary / All Classes Sheet ──────────────────────────────────────────
  const summaryRows = [];
  summaryRows.push(['ACADEMIC TIMETABLE MASTER SCHEDULE']);
  summaryRows.push(['Generated on:', new Date().toLocaleString()]);
  summaryRows.push([]);

  classes.forEach(cls => {
    summaryRows.push([`CLASS: ${cls.label} (${cls.periodsPerDay} periods/day)`]);
    const headerRow = ['Period', 'Time Slot', ...DAYS];
    summaryRows.push(headerRow);

    const clsTimetable = timetable ? timetable[cls.id] : null;

    for (let pIdx = 0; pIdx < cls.periodsPerDay; pIdx++) {
      const timeStr = PERIOD_TIMES[pIdx] || `Period ${pIdx + 1}`;
      const row = [`P${pIdx + 1}`, timeStr];

      DAYS.forEach(day => {
        const slot = clsTimetable?.[day]?.[pIdx];
        if (!slot) {
          row.push('—');
        } else if (slot.isElective) {
          const details = (slot.assignments || [])
            .map(a => `${a.subject} (${a.teacherName})`)
            .join(' | ');
          row.push(`[Elective: ${slot.electiveGroup}] ${details}`);
        } else {
          row.push(`${slot.subject}\n(${slot.teacherName})`);
        }
      });
      summaryRows.push(row);
    }
    summaryRows.push([]);
    summaryRows.push([]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'All Timetables');

  // ── 2. Individual Class Worksheets ──────────────────────────────────────────
  classes.forEach(cls => {
    const classRows = [
      [`TIMETABLE: ${cls.label.toUpperCase()}`],
      [`Daily Limit: ${cls.periodsPerDay} periods per day`],
      [],
      ['Period', 'Time Slot', ...DAYS],
    ];

    const clsTimetable = timetable ? timetable[cls.id] : null;

    for (let pIdx = 0; pIdx < cls.periodsPerDay; pIdx++) {
      const timeStr = PERIOD_TIMES[pIdx] || `Period ${pIdx + 1}`;
      const row = [`P${pIdx + 1}`, timeStr];

      DAYS.forEach(day => {
        const slot = clsTimetable?.[day]?.[pIdx];
        if (!slot) {
          row.push('Free Slot');
        } else if (slot.isElective) {
          const details = (slot.assignments || [])
            .map(a => `${a.subject} (${a.teacherName})`)
            .join(' / ');
          row.push(`[Elective] ${details}`);
        } else {
          row.push(`${slot.subject} - ${slot.teacherName}`);
        }
      });
      classRows.push(row);
    }

    const wsClass = XLSX.utils.aoa_to_sheet(classRows);
    wsClass['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];

    // Excel sheet name max length is 31 chars and no special chars
    const safeSheetName = cls.label.replace(/[:\\/?*[]]/g, '').slice(0, 30);
    XLSX.utils.book_append_sheet(wb, wsClass, safeSheetName || cls.id);
  });

  // ── 3. Teacher Workload Summary ─────────────────────────────────────────────
  const teacherRows = [
    ['TEACHER WORKLOAD & ASSIGNMENT SUMMARY'],
    [],
    ['Teacher Name', 'Assigned Classes', 'Subjects Taught', 'Total Weekly Hours', 'Blocked Slots Count']
  ];

  teachers.forEach(t => {
    const assignedClasses = [...new Set((t.subjects || []).map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return cls ? cls.label : s.classId;
    }))].join(', ');

    const assignedSubjects = [...new Set((t.subjects || []).map(s => s.subject))].join(', ');
    const totalHours = (t.subjects || []).reduce((acc, s) => acc + (Number(s.hoursPerWeek) || 0), 0);
    const blockedCount = (t.blockedSlots || []).length;

    teacherRows.push([t.name, assignedClasses || 'None', assignedSubjects || 'None', totalHours, blockedCount]);
  });

  const wsTeachers = XLSX.utils.aoa_to_sheet(teacherRows);
  wsTeachers['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Staff Workload');

  // ── 4. Embedded Config Data Sheet (For re-importing) ───────────────────────
  const configJsonStr = JSON.stringify({ classes, subjects, teachers, timetable });
  const wsConfig = XLSX.utils.aoa_to_sheet([
    ['CONFIG_DATA'],
    [configJsonStr]
  ]);
  XLSX.utils.book_append_sheet(wb, wsConfig, '_Config_Backup');

  const filename = `Timetable_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Parse an Excel file ArrayBuffer and extract timetable configuration.
 * Supports multi-sheet, single-sheet, and flexible column headers.
 */
export function parseExcelImport(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  // 1. Check if there is an embedded _Config_Backup sheet from an export
  if (wb.SheetNames.includes('_Config_Backup')) {
    try {
      const ws = wb.Sheets['_Config_Backup'];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows && rows[1] && rows[1][0]) {
        const parsed = JSON.parse(rows[1][0]);
        if (parsed.classes && parsed.teachers) {
          return parsed;
        }
      }
    } catch {
      // Fallback to manual sheet parsing below
    }
  }

  let classes = [];
  let subjects = [];
  let teachers = [];

  // Helper to find cell value matching multiple column aliases
  function findCol(row, aliases) {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const match = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase());
      if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
        return String(row[match]).trim();
      }
    }
    return '';
  }

  // 2. Try parsing Classes sheet
  const classesSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('class') || n.toLowerCase().includes('batch'));
  if (classesSheetName) {
    const rawClasses = XLSX.utils.sheet_to_json(wb.Sheets[classesSheetName]);
    classes = rawClasses.map((row, idx) => {
      const label = findCol(row, ['Class Label', 'Class Name', 'Class', 'Batch', 'Course', 'label', 'name', 'id']) || `Class ${idx + 1}`;
      const id = findCol(row, ['Class ID', 'id', 'ID']) || `cls_${label.replace(/\s+/g, '_')}`;
      const ppd = Math.max(1, Number(findCol(row, ['Periods Per Day', 'Periods', 'periodsPerDay', 'ppd']) || 5));
      return { id, label, periodsPerDay: ppd };
    });
  }

  const classMap = {};
  classes.forEach(c => {
    classMap[c.id] = c.id;
    classMap[c.label.toLowerCase()] = c.id;
  });

  // 3. Try parsing Teachers sheet
  const teachersSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('teacher') || n.toLowerCase().includes('staff') || n.toLowerCase().includes('faculty'));
  if (teachersSheetName) {
    const rawTeachers = XLSX.utils.sheet_to_json(wb.Sheets[teachersSheetName]);
    const teacherMap = {};

    rawTeachers.forEach((row, idx) => {
      const name = findCol(row, ['Teacher Name', 'Teacher', 'Faculty', 'Instructor', 'Staff', 'Professor', 'name']) || `Teacher ${idx + 1}`;
      const tId = findCol(row, ['Teacher ID', 'id']) || `t_${name.replace(/\s+/g, '_')}`;

      if (!teacherMap[tId]) {
        teacherMap[tId] = {
          id: tId,
          name,
          subjects: [],
          blockedSlots: []
        };
      }

      const subjName = findCol(row, ['Subject', 'Subject Name', 'Course', 'Module', 'subject']);
      const rawClass = findCol(row, ['Class ID', 'Class Label', 'Class Name', 'Class', 'Batch', 'classId']);
      const classId = classMap[rawClass.toLowerCase()] || rawClass || (classes[0] ? classes[0].id : 'UG-1A');
      const hoursPerWeek = Math.max(1, Number(findCol(row, ['Hours Per Week', 'Hours', 'Weekly Hours', 'periods', 'hoursPerWeek']) || 3));
      const isElective = findCol(row, ['Is Elective', 'Elective', 'isElective']).toLowerCase().startsWith('y');
      const electiveGroup = findCol(row, ['Elective Group', 'Group', 'electiveGroup']);

      if (subjName) {
        teacherMap[tId].subjects.push({
          id: `subj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          classId,
          subject: subjName,
          hoursPerWeek,
          isElective,
          electiveGroup
        });
      }

      const blockedStr = findCol(row, ['Blocked Slots (Day:Period)', 'Blocked Slots', 'Blocked', 'blockedSlots']);
      if (blockedStr) {
        const slots = parseBlockedSlotsString(blockedStr);
        teacherMap[tId].blockedSlots.push(...slots);
      }
    });

    teachers = Object.values(teacherMap);
  }

  // 4. Fallback for single-sheet Excel files (Combined list)
  if (classes.length === 0 || teachers.length === 0) {
    const firstSheetName = wb.SheetNames[0];
    const rawAll = XLSX.utils.sheet_to_json(wb.Sheets[firstSheetName]);

    const extractedClasses = new Set();
    const extractedTeacherMap = {};

    rawAll.forEach((row, idx) => {
      const clsName = findCol(row, ['Class', 'Class Name', 'Class Label', 'Batch', 'Course', 'Department']) || 'Default Class';
      extractedClasses.add(clsName);

      const teacherName = findCol(row, ['Teacher', 'Teacher Name', 'Faculty', 'Staff', 'Instructor']) || `Teacher ${idx + 1}`;
      const subjName = findCol(row, ['Subject', 'Subject Name', 'Course Name', 'Module']) || 'General Subject';
      const hours = Math.max(1, Number(findCol(row, ['Hours', 'Hours Per Week', 'Weekly Hours', 'Periods']) || 3));
      const isElective = findCol(row, ['Is Elective', 'Elective']).toLowerCase().startsWith('y');

      if (!extractedTeacherMap[teacherName]) {
        extractedTeacherMap[teacherName] = {
          id: `t_${teacherName.replace(/\s+/g, '_')}`,
          name: teacherName,
          subjects: [],
          blockedSlots: []
        };
      }

      extractedTeacherMap[teacherName].subjects.push({
        id: `subj_${idx}_${Date.now()}`,
        classId: `cls_${clsName.replace(/\s+/g, '_')}`,
        subject: subjName,
        hoursPerWeek: hours,
        isElective,
        electiveGroup: ''
      });
    });

    if (extractedClasses.size > 0) {
      classes = Array.from(extractedClasses).map(clsName => ({
        id: `cls_${clsName.replace(/\s+/g, '_')}`,
        label: clsName,
        periodsPerDay: 5
      }));
      teachers = Object.values(extractedTeacherMap);
    }
  }

  if (classes.length === 0 && teachers.length === 0) {
    throw new Error('Could not parse valid timetable data from Excel. Please check column headers or use the Excel Template.');
  }

  return { classes, subjects, teachers, timetable: null };
}

/**
 * Helper to parse blocked slot string like "Monday:1, Tuesday:3" or "0:1" into [{ day: 0, period: 0 }, ...]
 */
function parseBlockedSlotsString(str) {
  const result = [];
  const parts = str.split(/[,;]/);

  parts.forEach(part => {
    const [dayStr, periodStr] = part.split(':').map(s => s.trim());
    if (dayStr !== undefined && periodStr !== undefined) {
      let dayIndex = -1;
      const numDay = Number(dayStr);
      if (!isNaN(numDay) && numDay >= 0 && numDay < 5) {
        dayIndex = numDay;
      } else {
        dayIndex = DAYS.findIndex(d => d.toLowerCase().startsWith(dayStr.toLowerCase()));
      }

      const periodIndex = Number(periodStr) - 1; // 1-indexed to 0-indexed
      if (dayIndex >= 0 && dayIndex < 5 && !isNaN(periodIndex) && periodIndex >= 0) {
        result.push({ day: dayIndex, period: periodIndex });
      }
    }
  });

  return result;
}
