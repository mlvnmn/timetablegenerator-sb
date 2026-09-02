import { parseExcelImport } from './excelUtils';

/**
 * Read a File object as ArrayBuffer for Excel file parsing.
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file as ArrayBuffer.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Handle single Excel file import (.xlsx / .xls / .csv).
 */
export async function processImportFile(file) {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

  if (!isExcel) {
    throw new Error(`Invalid file "${file.name}". Please upload an Excel spreadsheet (.xlsx, .xls, or .csv).`);
  }

  const buffer = await readFileAsArrayBuffer(file);
  return parseExcelImport(buffer);
}

/**
 * Process multiple Excel files simultaneously and merge their data into a single unified config.
 */
export async function processMultipleImportFiles(files) {
  const fileArray = Array.from(files || []);
  if (fileArray.length === 0) return { classes: [], subjects: [], teachers: [], timetable: null };

  const parsedConfigs = await Promise.all(
    fileArray.map(file => processImportFile(file))
  );

  return mergeImportedConfigs(parsedConfigs);
}

/**
 * Merge an array of parsed configurations into one unified dataset.
 */
export function mergeImportedConfigs(configs) {
  const mergedClassesMap = {};
  const mergedSubjectsMap = {};
  const mergedTeachersMap = {};
  let mergedTimetable = null;

  configs.forEach(cfg => {
    // 1. Merge Classes
    (cfg.classes || []).forEach(c => {
      const key = c.label.trim().toLowerCase();
      if (!mergedClassesMap[key]) {
        mergedClassesMap[key] = { ...c };
      }
    });

    // Lookup table for resolving class labels & IDs across files
    const classIdLookup = {};
    Object.values(mergedClassesMap).forEach(c => {
      classIdLookup[c.label.trim().toLowerCase()] = c.id;
      classIdLookup[c.id] = c.id;
    });

    // 2. Merge Subjects
    (cfg.subjects || []).forEach(s => {
      const targetClassId = classIdLookup[s.classId] || s.classId;
      const key = `${s.name.trim().toLowerCase()}::${targetClassId}`;
      if (!mergedSubjectsMap[key]) {
        mergedSubjectsMap[key] = { ...s, classId: targetClassId };
      }
    });

    // 3. Merge Teachers & Workloads
    (cfg.teachers || []).forEach(t => {
      const key = t.name.trim().toLowerCase();
      if (!mergedTeachersMap[key]) {
        mergedTeachersMap[key] = {
          id: t.id || `t_${key.replace(/\s+/g, '_')}`,
          name: t.name.trim(),
          subjects: [],
          blockedSlots: []
        };
      }

      // Merge teacher subject assignments
      (t.subjects || []).forEach(subj => {
        const targetClassId = classIdLookup[subj.classId] || subj.classId;
        const exists = mergedTeachersMap[key].subjects.some(
          existing => existing.subject.toLowerCase() === subj.subject.toLowerCase() && existing.classId === targetClassId
        );
        if (!exists) {
          mergedTeachersMap[key].subjects.push({
            ...subj,
            classId: targetClassId
          });
        }
      });

      // Merge blocked availability slots
      (t.blockedSlots || []).forEach(slot => {
        const exists = mergedTeachersMap[key].blockedSlots.some(
          b => b.day === slot.day && b.period === slot.period
        );
        if (!exists) {
          mergedTeachersMap[key].blockedSlots.push(slot);
        }
      });
    });

    if (cfg.timetable) {
      mergedTimetable = cfg.timetable;
    }
  });

  return {
    classes: Object.values(mergedClassesMap),
    subjects: Object.values(mergedSubjectsMap),
    teachers: Object.values(mergedTeachersMap),
    timetable: mergedTimetable
  };
}
