/**
 * Allocation Utilities for Subject-Teacher Hour Assignments
 * Supports:
 * - Single-teacher & multi-teacher (2 to 3+ co-teachers) split by hours
 * - Components (Theory, Lab, Tutorial, Practical, Seminar)
 * - Joint / Combined lectures across multiple classes
 * - Parallel Elective Groups with multiple options (primary and elective options)
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
      baseId: baseSubj.id,
      name: baseSubj.name,
      hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
      isElective: true,
      isCombined: !!baseSubj.isCombined,
      combinedWithClasses: baseSubj.combinedWithClasses || [],
    };
  } else if (parts[1] === 'elective') {
    const idx = Number(parts[2]);
    const elName = baseSubj.electiveSubjects?.[idx] || '';
    return {
      id: subjectId,
      baseId: baseSubj.id,
      name: elName || `Elective Option ${idx + 2}`,
      hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
      isElective: true,
      isCombined: !!baseSubj.isCombined,
      combinedWithClasses: baseSubj.combinedWithClasses || [],
    };
  }
  return {
    ...baseSubj,
    baseId: baseSubj.id,
    hoursPerWeek: Number(baseSubj.hoursPerWeek) || 0,
  };
}

/**
 * Match helper checking whether an assignment's subjectId matches the target subjectId
 * (handles fallback between "subj_123" and "subj_123::primary").
 */
function isSubjectMatch(asgnSubjId, targetSubjId) {
  if (asgnSubjId === targetSubjId) return true;
  if (targetSubjId.endsWith('::primary') && asgnSubjId === targetSubjId.replace('::primary', '')) return true;
  if (asgnSubjId && asgnSubjId.endsWith('::primary') && asgnSubjId.replace('::primary', '') === targetSubjId) return true;
  return false;
}

/**
 * Get all teacher allocations for a specific subject (or elective option) in a specific class.
 */
export function getSubjectAllocations(subjectId, classId, teachers, subjects = []) {
  if (!subjectId || !classId || !teachers) return [];
  const result = [];

  let linkedSubjectIds = [subjectId];
  const parts = subjectId.split('::');
  const baseSubj = (subjects || []).find(s => s.id === parts[0]);
  if (baseSubj && baseSubj.jointGroupId) {
    (subjects || []).forEach(other => {
      if (other.jointGroupId === baseSubj.jointGroupId && other.id !== baseSubj.id) {
        if (parts[1] === 'primary') linkedSubjectIds.push(`${other.id}::primary`);
        else if (parts[1] === 'elective') linkedSubjectIds.push(`${other.id}::elective::${parts[2]}`);
        else linkedSubjectIds.push(other.id);
      }
    });
  }

  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach((asgn, asgnIndex) => {
      if (asgn.classId === classId && linkedSubjectIds.some(targetId => isSubjectMatch(asgn.subjectId, targetId))) {
        const hrs = asgn.isCustomHours
          ? (Number(asgn.customHours) || 0)
          : (Number(asgn.hoursPerWeek) || 0);

        result.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          hours: hrs,
          component: asgn.component || 'Theory',
          asgnIndex,
        });
      }
    });
  });

  return result;
}

/**
 * Save new allocations for a subject in a class across all teachers.
 * Automatically synchronizes to any linked combined classes, translating subject IDs per class.
 */
export function saveSubjectAllocations(
  subjectId,
  classId,
  newAllocations,
  teachers,
  setTeachers,
  combinedClasses = [],
  subjects = []
) {
  const targetClasses = Array.from(new Set([classId, ...(combinedClasses || [])]));

  const parts = (subjectId || '').split('::');
  const baseId = parts[0];
  const originSubj = (subjects || []).find(s => s.id === baseId);

  const getSubjectIdForClass = (cId) => {
    if (cId === classId) return subjectId;
    if (!originSubj) return subjectId;

    const cSubj = (subjects || []).find(s =>
      s.classId === cId && (
        (originSubj.jointGroupId && s.jointGroupId && s.jointGroupId === originSubj.jointGroupId) ||
        ((s.combinedWithClasses || []).includes(classId) && s.name.trim().toLowerCase() === originSubj.name.trim().toLowerCase()) ||
        (s.name.trim().toLowerCase() === originSubj.name.trim().toLowerCase())
      )
    );

    if (!cSubj) return subjectId;

    if (parts[1] === 'primary') {
      return `${cSubj.id}::primary`;
    } else if (parts[1] === 'elective') {
      return `${cSubj.id}::elective::${parts[2]}`;
    }
    return cSubj.id;
  };

  const classSubjectIdMap = {};
  targetClasses.forEach(cId => {
    classSubjectIdMap[cId] = getSubjectIdForClass(cId);
  });

  setTeachers(prevTeachers => {
    return prevTeachers.map(teacher => {
      const teacherAllocations = newAllocations.filter(a => a.teacherId === teacher.id);

      const keptAssignments = (teacher.subjects || []).filter(asgn => {
        if (!targetClasses.includes(asgn.classId)) return true;
        const targetSubjIdForThisClass = classSubjectIdMap[asgn.classId];
        if (isSubjectMatch(asgn.subjectId, targetSubjIdForThisClass)) return false;
        if (isSubjectMatch(asgn.subjectId, subjectId)) return false;
        return true;
      });

      const addedAssignments = [];
      if (teacherAllocations.length > 0) {
        targetClasses.forEach(cId => {
          const targetSubjId = classSubjectIdMap[cId];
          teacherAllocations.forEach(alloc => {
            addedAssignments.push({
              classId: cId,
              subjectId: targetSubjId,
              hoursPerWeek: Number(alloc.hours) || 0,
              customHours: Number(alloc.hours) || 0,
              isCustomHours: true,
              component: alloc.component || 'Theory',
              isCombined: targetClasses.length > 1,
              combinedClasses: targetClasses,
            });
          });
        });
      }

      return {
        ...teacher,
        subjects: [...keptAssignments, ...addedAssignments],
      };
    });
  });
}

/**
 * Calculates hour allocations and validation for all teacher-subject assignments.
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
    const firstSep = groupKey.indexOf('::');
    const subjectId = firstSep !== -1 ? groupKey.slice(firstSep + 2) : groupKey;
    const resolvedSubj = getResolvedSubject(subjects, subjectId);
    const totalHours = resolvedSubj ? resolvedSubj.hoursPerWeek : 0;

    let customSum = 0;
    const autoAssignments = [];

    assignments.forEach(item => {
      const { asgn, teacherName, teacherId, index } = item;
      const isCustom = !!asgn.isCustomHours;
      const val = Number(asgn.customHours || asgn.hoursPerWeek);

      if (isCustom) {
        const customHrs = isNaN(val) ? 0 : val;
        if (customHrs < 0) {
          errors.push({
            teacherId,
            groupKey,
            message: `${teacherName}: Custom hours cannot be negative (${customHrs} hrs).`,
          });
        }
        customSum += Math.max(0, customHrs);
        allocations.set(`${teacherId}::${index}`, Math.max(0, customHrs));
      } else {
        autoAssignments.push(item);
      }
    });

    if (customSum > totalHours && autoAssignments.length === 0) {
      errors.push({
        groupKey,
        message: `${resolvedSubj?.name || 'Subject'}: Assigned hours (${customSum} hrs) exceed quota (${totalHours} hrs).`,
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
      allocatedTotal: customSum + (autoCount > 0 ? remainingHours : 0),
    });
  });

  return {
    allocations,
    subjectSummaries,
    errors,
  };
}
