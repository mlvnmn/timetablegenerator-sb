import { DAYS } from '../constants';

/**
 * Move or swap a timetable slot, synchronizing joint lectures and elective groups across all linked classes.
 *
 * @param {Object} params
 * @param {Object} params.timetable - Current timetable object { [classId]: { [day]: slot[] } }
 * @param {string} params.sourceClassId - Class where the drag originated
 * @param {string} params.fromDay - Source day (e.g. 'Tuesday')
 * @param {number} params.fromPeriod - Source period index (0-indexed)
 * @param {string} params.toDay - Target day (e.g. 'Wednesday')
 * @param {number} params.toPeriod - Target period index (0-indexed)
 * @param {Array} params.classes - Array of class configuration objects
 * @returns {Object} { updatedTimetable, affectedClassLabels, actionType, sourceName, targetName }
 */
export function moveOrSwapSlot({
  timetable,
  sourceClassId,
  fromDay,
  fromPeriod,
  toDay,
  toPeriod,
  classes
}) {
  // If dropped on the same slot, do nothing
  if (fromDay === toDay && fromPeriod === toPeriod) {
    return {
      updatedTimetable: timetable,
      affectedClassLabels: [],
      actionType: 'none',
      sourceName: '',
      targetName: ''
    };
  }

  // Deep clone the timetable to ensure React state immutability
  const nextTimetable = {};
  classes.forEach(c => {
    nextTimetable[c.id] = {};
    const periodsCount = c.periodsPerDay || 6;
    DAYS.forEach(d => {
      const dayArr = timetable[c.id]?.[d] || [];
      const row = Array(periodsCount).fill(null);
      for (let i = 0; i < periodsCount; i++) {
        row[i] = dayArr[i] ? { ...dayArr[i] } : null;
      }
      nextTimetable[c.id][d] = row;
    });
  });

  // Preserve any other classes that might exist in timetable
  Object.keys(timetable || {}).forEach(cId => {
    if (!nextTimetable[cId]) {
      nextTimetable[cId] = {};
      DAYS.forEach(d => {
        const dayArr = timetable[cId]?.[d] || [];
        nextTimetable[cId][d] = dayArr.map(cell => (cell ? { ...cell } : null));
      });
    }
  });

  const sourceCell = nextTimetable[sourceClassId]?.[fromDay]?.[fromPeriod];
  if (!sourceCell) {
    return {
      updatedTimetable: timetable,
      affectedClassLabels: [],
      actionType: 'none',
      sourceName: '',
      targetName: ''
    };
  }

  const targetCell = nextTimetable[sourceClassId]?.[toDay]?.[toPeriod];
  const sourceName = sourceCell.subject || 'Lecture';
  const targetName = targetCell ? (targetCell.subject || 'Lecture') : '';
  const actionType = targetCell ? 'swap' : 'move';

  // ── Find all classes linked to the SOURCE cell ────────────────────────────
  const sourceLinkedClassIds = new Set([sourceClassId]);

  if (sourceCell.isElective && sourceCell.electiveGroup) {
    classes.forEach(c => {
      const cell = nextTimetable[c.id]?.[fromDay]?.[fromPeriod];
      if (cell && cell.isElective && cell.electiveGroup === sourceCell.electiveGroup) {
        sourceLinkedClassIds.add(c.id);
      }
    });
  } else if (sourceCell.isCombined) {
    const combinedLabels = sourceCell.combinedClasses || [];
    classes.forEach(c => {
      if (c.id === sourceClassId) return;
      const cell = nextTimetable[c.id]?.[fromDay]?.[fromPeriod];
      const isMatchByLabel = combinedLabels.includes(c.label) || combinedLabels.includes(c.id);
      const isMatchBySlot = cell && cell.isCombined && cell.subject === sourceCell.subject;
      if (isMatchByLabel || isMatchBySlot) {
        sourceLinkedClassIds.add(c.id);
      }
    });
  }

  // ── Find all classes linked to the TARGET cell (if occupied) ──────────────
  const targetLinkedClassIds = new Set();
  if (targetCell) {
    targetLinkedClassIds.add(sourceClassId);
    if (targetCell.isElective && targetCell.electiveGroup) {
      classes.forEach(c => {
        const cell = nextTimetable[c.id]?.[toDay]?.[toPeriod];
        if (cell && cell.isElective && cell.electiveGroup === targetCell.electiveGroup) {
          targetLinkedClassIds.add(c.id);
        }
      });
    } else if (targetCell.isCombined) {
      const combinedLabels = targetCell.combinedClasses || [];
      classes.forEach(c => {
        if (c.id === sourceClassId) return;
        const cell = nextTimetable[c.id]?.[toDay]?.[toPeriod];
        const isMatchByLabel = combinedLabels.includes(c.label) || combinedLabels.includes(c.id);
        const isMatchBySlot = cell && cell.isCombined && cell.subject === targetCell.subject;
        if (isMatchByLabel || isMatchBySlot) {
          targetLinkedClassIds.add(c.id);
        }
      });
    }
  }

  // ── Perform Synchronized Swap/Move ─────────────────────────────────────────
  // 1. Move source cell across all its linked classes
  sourceLinkedClassIds.forEach(cId => {
    const cellA = nextTimetable[cId][fromDay][fromPeriod];
    const cellB = nextTimetable[cId][toDay][toPeriod];

    nextTimetable[cId][toDay][toPeriod] = cellA;
    nextTimetable[cId][fromDay][fromPeriod] = cellB;
  });

  // 2. If target had linked classes that weren't in sourceLinkedClassIds, move their slots as well
  targetLinkedClassIds.forEach(cId => {
    if (!sourceLinkedClassIds.has(cId)) {
      const cellA = nextTimetable[cId][fromDay][fromPeriod];
      const cellB = nextTimetable[cId][toDay][toPeriod];

      nextTimetable[cId][fromDay][fromPeriod] = cellB;
      nextTimetable[cId][toDay][toPeriod] = cellA;
    }
  });

  // Collect labels of all affected classes
  const allAffectedIds = new Set([...sourceLinkedClassIds, ...targetLinkedClassIds]);
  const affectedClassLabels = Array.from(allAffectedIds).map(id => {
    return classes.find(c => c.id === id)?.label || id;
  });

  return {
    updatedTimetable: nextTimetable,
    affectedClassLabels,
    actionType,
    sourceName,
    targetName
  };
}

/**
 * Detect teacher double-booking conflicts across the entire weekly timetable.
 * Returns a map of conflicts keyed by `${classId}::${day}::${periodIndex}`.
 */
export function detectTeacherClashes(timetable, classes) {
  const clashMap = new Map(); // key: `${classId}::${day}::${periodIndex}` -> clash details

  if (!timetable || !classes) return clashMap;

  DAYS.forEach(day => {
    // Find maximum periods across all classes
    let maxPeriods = 8;
    classes.forEach(c => {
      maxPeriods = Math.max(maxPeriods, c.periodsPerDay || 6);
    });

    for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
      // Map teacherId -> array of { classId, classLabel, subject, isCombined, electiveGroup }
      const teacherSlots = new Map();

      classes.forEach(cls => {
        const cell = timetable[cls.id]?.[day]?.[pIdx];
        if (!cell) return;

        // Extract all teacher IDs in this cell (handles regular, joint, and elective multi-teachers)
        const teachersInCell = [];
        if (cell.isElective && Array.isArray(cell.assignments)) {
          cell.assignments.forEach(asg => {
            if (asg.teacherId) {
              teachersInCell.push({
                teacherId: asg.teacherId,
                teacherName: asg.teacherName,
                subject: asg.subject,
                classId: cls.id,
                classLabel: cls.label,
                isCombined: !!cell.isCombined,
                electiveGroup: cell.electiveGroup || '',
              });
            }
          });
        } else if (cell.teacherId) {
          teachersInCell.push({
            teacherId: cell.teacherId,
            teacherName: cell.teacherName,
            subject: cell.subject,
            classId: cls.id,
            classLabel: cls.label,
            isCombined: !!cell.isCombined,
            electiveGroup: cell.electiveGroup || '',
          });
        }

        teachersInCell.forEach(item => {
          if (!teacherSlots.has(item.teacherId)) {
            teacherSlots.set(item.teacherId, []);
          }
          teacherSlots.get(item.teacherId).push(item);
        });
      });

      // Check each teacher for double-booking
      teacherSlots.forEach((items, teacherId) => {
        if (items.length <= 1) return;

        // Check if all these classes are participating in the SAME joint lecture or elective group
        const first = items[0];
        const isLegitJoint = items.every(item => {
          if (first.electiveGroup && item.electiveGroup) {
            return first.electiveGroup === item.electiveGroup && first.subject === item.subject;
          }
          if (first.isCombined && item.isCombined) {
            return first.subject === item.subject;
          }
          return false;
        });

        // If not a shared joint lecture, this is an illegal double-booking clash!
        if (!isLegitJoint) {
          const teacherName = items[0].teacherName || 'Faculty';

          items.forEach(item => {
            const key = `${item.classId}::${day}::${pIdx}`;
            clashMap.set(key, {
              teacherId,
              teacherName,
              day,
              periodIndex: pIdx,
              conflictingClasses: items.filter(x => x.classId !== item.classId).map(x => x.classLabel),
              message: `${teacherName} is double-booked with ${items.filter(x => x.classId !== item.classId).map(x => x.classLabel).join(', ')}`,
            });
          });
        }
      });
    }
  });

  return clashMap;
}
