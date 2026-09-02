import { parseExcelImport } from './excelUtils';
import { parsePdfImport, parseDocxImport } from './docImportUtils';

/**
 * Read a File object as ArrayBuffer.
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
 * Handle single file import (.xlsx / .xls / .csv / .pdf / .docx / .doc).
 */
export async function processImportFile(file) {
  const fileName = file.name.toLowerCase();
  const buffer = await readFileAsArrayBuffer(file);

  if (fileName.endsWith('.pdf')) {
    return parsePdfImport(buffer);
  }

  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return parseDocxImport(buffer);
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    return parseExcelImport(buffer);
  }

  throw new Error(`Unsupported file type "${file.name}". Please upload an Excel (.xlsx, .csv), PDF (.pdf), or Word (.docx) document.`);
}

/**
 * Process multiple files simultaneously (mixing Excel, PDF, Word) and merge their data into a single unified config.
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
 * Merge an array of parsed configurations into one unified dataset,
 * automatically creating master subject entries for all teacher assignments and linking subjectIds.
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

    // 2. Merge Master Subjects
    (cfg.subjects || []).forEach(s => {
      const targetClassId = classIdLookup[s.classId] || s.classId;
      const key = `${s.name.trim().toLowerCase()}::${targetClassId}`;
      if (!mergedSubjectsMap[key]) {
        mergedSubjectsMap[key] = {
          id: s.id || `sub_${targetClassId}_${s.name.trim().replace(/\s+/g, '_').toLowerCase()}`,
          ...s,
          classId: targetClassId
        };
      }
    });

    // 3. Merge Teachers & Workloads, and auto-populate master subjects from teacher assignments
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

      // Merge teacher subject assignments & ensure corresponding master subject exists
      (t.subjects || []).forEach(subj => {
        const targetClassId = classIdLookup[subj.classId] || subj.classId;
        const subjName = (subj.subject || '').trim();
        if (!subjName) return;

        const subjKey = `${subjName.toLowerCase()}::${targetClassId}`;
        let masterSubj = mergedSubjectsMap[subjKey];

        if (!masterSubj) {
          masterSubj = {
            id: `sub_${targetClassId}_${subjName.replace(/\s+/g, '_').toLowerCase()}`,
            classId: targetClassId,
            name: subjName,
            hoursPerWeek: Number(subj.hoursPerWeek) || 3,
            isElective: !!subj.isElective,
            electiveSubjects: []
          };
          mergedSubjectsMap[subjKey] = masterSubj;
        }

        const exists = mergedTeachersMap[key].subjects.some(
          existing => existing.subject.toLowerCase() === subjName.toLowerCase() && existing.classId === targetClassId
        );
        if (!exists) {
          mergedTeachersMap[key].subjects.push({
            ...subj,
            subject: subjName,
            classId: targetClassId,
            subjectId: masterSubj.id
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
