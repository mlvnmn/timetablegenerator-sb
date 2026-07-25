/**
 * Parse a timetable_data.json file and return { classes, subjects, teachers, timetable }.
 * Throws if the file is invalid.
 */
export function parseImportFile(fileContent) {
  let data;
  try {
    data = JSON.parse(fileContent);
  } catch {
    throw new Error('Invalid JSON file. Please upload a valid timetable_data.json.');
  }

  if (!data.classes || !Array.isArray(data.classes)) {
    throw new Error('JSON missing "classes" array.');
  }
  if (!data.teachers || !Array.isArray(data.teachers)) {
    throw new Error('JSON missing "teachers" array.');
  }

  // Validate & normalise each class entry
  const classes = data.classes.map((c, i) => {
    if (!c.id)                           throw new Error(`Class at index ${i} is missing an "id".`);
    if (!c.label || !c.label.trim())     throw new Error(`Class "${c.id}" is missing a "label".`);
    const ppd = Number(c.periodsPerDay);
    if (!ppd || ppd < 1)                 throw new Error(`Class "${c.id}" has an invalid "periodsPerDay" value.`);
    return { id: c.id, label: c.label.trim(), periodsPerDay: ppd };
  });

  // Normalise subjects (optional — older exports may not have this)
  const subjects = Array.isArray(data.subjects)
    ? data.subjects.map((s, i) => {
        if (!s.id)      throw new Error(`Subject at index ${i} is missing an "id".`);
        if (!s.classId) throw new Error(`Subject "${s.id}" is missing a "classId".`);
        if (!s.name)    throw new Error(`Subject "${s.id}" is missing a "name".`);
        return {
          id:           s.id,
          classId:      s.classId,
          name:         s.name.trim(),
          hoursPerWeek: Math.max(1, Number(s.hoursPerWeek) || 3),
          isElective:   !!s.isElective,
          electiveSubjects: Array.isArray(s.electiveSubjects)
            ? s.electiveSubjects.map(name => name.trim())
            : [],
        };
      })
    : [];

  return {
    classes,
    subjects,
    teachers:  data.teachers,
    timetable: data.timetable || null,
  };
}

/**
 * Read a File object as text and return a Promise<string>.
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
