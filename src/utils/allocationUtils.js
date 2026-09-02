/**
 * Allocation Utilities for Subject-Teacher Hour Assignments
 */

/**
 * Helper to resolve subject details given a subjectId string
 * (handles base subjects, primary electives, and specific elective index).
 */
export function getResolvedSubject(subjects, subjectId) {
  if (!subjectId) return null;
  const parts = subjectId.split('::');
  const baseId = parts[0];
  const baseSubj = subjects.find(s => s.id === baseId);
  if (!baseSubj) return null;

  if (parts[1] === 'primary') {
    return {
      id: subjectId,
      name: baseSubj.name,
      hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
      isElective: true,
    };
  } else if (parts[1] === 'elective') {
    const idx = Number(parts[2]);
    const elName = baseSubj.electiveSubjects?.[idx] || '';
    return {
      id: subjectId,
      name: elName,
      hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
      isElective: true,
    };
  }
  return {
    ...baseSubj,
    hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
  };
}

/**
 * Calculates hour allocations and validation for all teacher-subject assignments.
 * 
 * @param {Array} classes 
 * @param {Array} subjects 
 * @param {Array} teachers 
 * @returns {Object} { allocations, subjectSummaries, errors }
 */
export function calculateSubjectAllocations(classes, subjects, teachers) {
  const allocations = new Map(); // key: `${teacherId}::${asgnIndex}` -> number of hours
  const subjectSummaries = new Map(); // key: `${classId}::${subjectId}` -> summary info
  const errors = [];

  // Group teacher assignments by `${classId}::${subjectId}`
  const groupMap = new Map();

  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach((asgn, index) => {
      if (!asgn.classId || !asgn.subjectId) return;

      const groupKey = `${asgn.classId}::${asgn.subjectId}`;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey).push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        index,
        asgn,
      });
    });
  });

  // Calculate allocations for each subject in each class
  groupMap.forEach((assignments, groupKey) => {
    const [, subjectId] = groupKey.split('::');
    const resolvedSubj = getResolvedSubject(subjects, subjectId);
    const totalHours = resolvedSubj ? resolvedSubj.hoursPerWeek : 0;

    let customSum = 0;
    const autoAssignments = [];
    const customAssignments = [];

    assignments.forEach(item => {
      const { asgn, teacherName, teacherId, index } = item;
      const isCustom = !!asgn.isCustomHours;
      const val = Number(asgn.customHours);

      if (isCustom) {
        const customHrs = isNaN(val) ? 0 : val;
        if (customHrs < 0) {
          errors.push({
            teacherId,
            groupKey,
            message: `${teacherName}: Custom hours cannot be negative (${customHrs} hrs).`,
          });
        } else if (customHrs > totalHours) {
          errors.push({
            teacherId,
            groupKey,
            message: `${teacherName}: Custom hours (${customHrs} hrs) exceed total subject hours (${totalHours} hrs).`,
          });
        }
        customSum += Math.max(0, customHrs);
        customAssignments.push({ item, hours: Math.max(0, customHrs) });
        allocations.set(`${teacherId}::${index}`, Math.max(0, customHrs));
      } else {
        autoAssignments.push(item);
      }
    });

    if (customSum > totalHours) {
      errors.push({
        groupKey,
        message: `Total custom hours assigned (${customSum} hrs) exceed available subject hours (${totalHours} hrs).`,
      });
    }

    const remainingHours = Math.max(0, totalHours - customSum);
    const autoCount = autoAssignments.length;

    // Distribute remaining hours among automatic teachers
    if (autoCount > 0) {
      const baseShare = Math.floor(remainingHours / autoCount);
      const remainder = remainingHours % autoCount;

      autoAssignments.forEach((item, idx) => {
        const allocatedShare = baseShare + (idx < remainder ? 1 : 0);
        allocations.set(`${item.teacherId}::${item.index}`, allocatedShare);
      });
    }

    subjectSummaries.set(groupKey, {
      totalHours,
      customSum,
      remainingHours,
      autoCount,
      teacherCount: assignments.length,
    });
  });

  return {
    allocations,
    subjectSummaries,
    errors,
  };
}
