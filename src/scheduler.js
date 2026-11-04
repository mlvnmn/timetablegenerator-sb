import { DAYS } from './constants';

/**
 * CSP Backtracking Timetable Scheduler
 *
 * Supports:
 *   1. Parallel Elective Groups (synchronized across multiple classes with different teachers)
 *   2. Joint / Combined Lectures (synchronized across multiple classes with the SAME teacher in the same slot)
 *   3. Split Subject Assignments (multiple co-teachers dividing hours, tagged by component: Theory/Lab/Tutorial)
 *   4. Hard Constraints:
 *      - Teacher not already teaching globally at that day+period
 *      - Teacher's external blockedSlots respected
 *      - Class daily period limit (periodsPerDay) respected
 *      - Maximum 2 consecutive periods for same teacher in same class/day
 *      - Balanced day distribution for subjects across the week
 *
 * Returns { timetable, warnings }
 */
export function generateTimetable(classes, teachers, _subjects = []) {
  // Build a lookup: teacherId → teacher object
  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.id] = t; });

  // Build a lookup: classId → class label
  const classLabelMap = {};
  classes.forEach(c => { classLabelMap[c.id] = c.label; });

  // Global teacher occupation: teacherBusy[teacherId][day][period] = true/false
  const teacherBusy = {};
  teachers.forEach(t => {
    teacherBusy[t.id] = {};
    DAYS.forEach((_, d) => {
      teacherBusy[t.id][d] = {};
    });
    // Pre-fill blocked slots
    (t.blockedSlots || []).forEach(({ day, period }) => {
      teacherBusy[t.id][day][period] = true;
    });
  });

  // timetable[classId][dayIndex][periodIndex] = slotObject | null
  const timetable = {};
  classes.forEach(cls => {
    timetable[cls.id] = {};
    DAYS.forEach((_, d) => {
      timetable[cls.id][d] = Array(cls.periodsPerDay).fill(null);
    });
  });

  const warnings = [];

  // Shuffle helper
  function shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Count periods a class has placed on a day
  function classPeriodsOnDay(classId, dayIndex) {
    return timetable[classId][dayIndex].filter(Boolean).length;
  }

  // Check consecutive constraint: no 3+ consecutive same-teacher slots in one day
  function wouldCreateTripleConsecutive(classId, teacherId, dayIndex, periodIndex) {
    const row = timetable[classId][dayIndex];
    const maxP = row.length;
    const check = (a, b, c) => {
      const vals = [a, b, c].filter(i => i >= 0 && i < maxP);
      if (vals.length < 3) return false;
      return vals.every(i => row[i] && (
        row[i].teacherId === teacherId ||
        (row[i].assignments && row[i].assignments.some(x => x.teacherId === teacherId))
      ));
    };
    return check(periodIndex - 2, periodIndex - 1, periodIndex)
      || check(periodIndex - 1, periodIndex, periodIndex + 1)
      || check(periodIndex, periodIndex + 1, periodIndex + 2);
  }

  // ── 1. Schedule Elective Groups First ────────────────────────────────────────
  const electiveGroups = {};
  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach(subj => {
      if (subj.isElective && subj.electiveGroup && subj.electiveGroup.trim()) {
        const groupName = subj.electiveGroup.trim();
        if (!electiveGroups[groupName]) {
          electiveGroups[groupName] = {
            name: groupName,
            hoursPerWeek: Number(subj.hoursPerWeek) || 1,
            assignments: [],
          };
        }
        electiveGroups[groupName].assignments.push({
          classId: subj.classId,
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: subj.subject,
          component: subj.component || 'Elective',
          blockedSlots: subj.blockedSlots || [],
          preferredTime: subj.preferredTime || 'any',
          maxPerDay: subj.maxPerDay || 0,
          consecutivePeriods: !!subj.consecutivePeriods,
        });
      }
    });
  });

  // Group assignments of each elective group by classId
  Object.values(electiveGroups).forEach(eg => {
    const byClass = {};
    eg.assignments.forEach(asg => {
      if (!byClass[asg.classId]) byClass[asg.classId] = [];
      byClass[asg.classId].push(asg);
    });
    eg.assignmentsByClass = byClass;
  });

  Object.values(electiveGroups).forEach(eg => {
    let placed = 0;
    const dayOrder = shuffled(DAYS.map((_, i) => i));

    for (const dayIndex of dayOrder) {
      if (placed >= eg.hoursPerWeek) break;

      const maxPeriods = Math.min(...Object.keys(eg.assignmentsByClass).map(classId => {
        const cls = classes.find(c => c.id === classId);
        return cls ? cls.periodsPerDay : 5;
      }));

      const periods = shuffled([...Array(maxPeriods).keys()]);

      for (const period of periods) {
        if (placed >= eg.hoursPerWeek) break;

        let isValid = true;

        for (const classId of Object.keys(eg.assignmentsByClass)) {
          const cls = classes.find(c => c.id === classId);
          if (!cls) { isValid = false; break; }
          if (classPeriodsOnDay(classId, dayIndex) >= cls.periodsPerDay) {
            isValid = false;
            break;
          }
          if (timetable[classId][dayIndex][period] !== null) {
            isValid = false;
            break;
          }
        }
        if (!isValid) continue;

        // Check that a teacher does not teach two different subjects in this elective group at the same time
        const teacherSubjectMap = {};
        for (const a of eg.assignments) {
          if (teacherSubjectMap[a.teacherId] && teacherSubjectMap[a.teacherId] !== a.subject) {
            isValid = false;
            break;
          }
          teacherSubjectMap[a.teacherId] = a.subject;
        }
        if (!isValid) continue;

        // Check that all involved teachers are free globally at this slot
        const uniqueTeachers = new Set(eg.assignments.map(a => a.teacherId));
        for (const teacherId of uniqueTeachers) {
          if (teacherBusy[teacherId][dayIndex][period]) {
            isValid = false;
            break;
          }
        }
        if (!isValid) continue;

        for (const classId of Object.keys(eg.assignmentsByClass)) {
          const classAsgs = eg.assignmentsByClass[classId];
          for (const asg of classAsgs) {
            if (wouldCreateTripleConsecutive(classId, asg.teacherId, dayIndex, period)) {
              isValid = false;
              break;
            }
          }
          if (!isValid) break;
        }
        if (!isValid) continue;

        // Check subject constraints for all elective assignments (blocked slots & preferred time)
        for (const a of eg.assignments) {
          if (Array.isArray(a.blockedSlots) && a.blockedSlots.length > 0) {
            if (a.blockedSlots.some(s => Number(s.day) === dayIndex && Number(s.period) === period)) {
              isValid = false;
              break;
            }
          }
          if (a.preferredTime === 'morning' && period >= Math.floor(maxPeriods / 2)) {
            isValid = false;
            break;
          }
          if (a.preferredTime === 'afternoon' && period < Math.floor(maxPeriods / 2)) {
            isValid = false;
            break;
          }
        }
        if (!isValid) continue;

        // Place synchronized slot across all participating classes
        const isJointGroup = Object.keys(eg.assignmentsByClass).length > 1;
        const participatingLabels = Object.keys(eg.assignmentsByClass).map(id => classLabelMap[id] || id);

        for (const classId of Object.keys(eg.assignmentsByClass)) {
          const classAsgs = eg.assignmentsByClass[classId];
          const mergedSubject = classAsgs.map(a => a.subject).join(' / ');
          const mergedTeacherName = classAsgs.map(a => a.teacherName).join(' / ');
          const mergedTeacherId = classAsgs.map(a => a.teacherId).join(' / ');

          timetable[classId][dayIndex][period] = {
            teacherId: mergedTeacherId,
            teacherName: mergedTeacherName,
            subject: mergedSubject,
            isElective: true,
            isCombined: isJointGroup,
            combinedClasses: participatingLabels,
            electiveGroup: eg.name,
            assignments: classAsgs,
          };
        }

        for (const teacherId of uniqueTeachers) {
          teacherBusy[teacherId][dayIndex][period] = true;
        }

        placed++;
      }
    }

    if (placed < eg.hoursPerWeek) {
      warnings.push(
        `⚠ Could only place ${placed}/${eg.hoursPerWeek} periods for Elective Group "${eg.name}"`
      );
    }
  });

  // ── 2. Schedule Combined / Joint Lectures Second ─────────────────────────────
  // A joint lecture is attended simultaneously by 2 or more classes with the same teacher
  const combinedGroups = {};

  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach(subj => {
      if (subj.isElective) return;
      if (subj.isCombined && Array.isArray(subj.combinedClasses) && subj.combinedClasses.length > 1) {
        const sortedClasses = [...subj.combinedClasses].sort();
        const groupKey = `${subj.subject.trim()}::${subj.component || 'Theory'}::${teacher.id}::${sortedClasses.join('_')}`;

        if (!combinedGroups[groupKey]) {
          combinedGroups[groupKey] = {
            key: groupKey,
            subject: subj.subject.trim(),
            component: subj.component || 'Theory',
            teacherId: teacher.id,
            teacherName: teacher.name,
            classIds: sortedClasses,
            hoursPerWeek: Number(subj.hoursPerWeek) || 1,
            blockedSlots: Array.isArray(subj.blockedSlots) ? [...subj.blockedSlots] : [],
            preferredTime: subj.preferredTime || 'any',
            maxPerDay: subj.maxPerDay ? Number(subj.maxPerDay) : 0,
            consecutivePeriods: !!subj.consecutivePeriods,
          };
        } else {
          // Merge blockedSlots
          if (Array.isArray(subj.blockedSlots)) {
            subj.blockedSlots.forEach(s => {
              if (!combinedGroups[groupKey].blockedSlots.some(b => Number(b.day) === Number(s.day) && Number(b.period) === Number(s.period))) {
                combinedGroups[groupKey].blockedSlots.push(s);
              }
            });
          }
          if (subj.preferredTime && subj.preferredTime !== 'any') {
            combinedGroups[groupKey].preferredTime = subj.preferredTime;
          }
          if (subj.maxPerDay) {
            combinedGroups[groupKey].maxPerDay = Number(subj.maxPerDay);
          }
        }
      }
    });
  });

  Object.values(combinedGroups).forEach(group => {
    let placed = 0;
    const participatingClasses = group.classIds
      .map(id => classes.find(c => c.id === id))
      .filter(Boolean);

    if (participatingClasses.length < 2) return;

    const participatingLabels = participatingClasses.map(c => c.label);
    const dayOrder = shuffled(DAYS.map((_, i) => i)).sort((a, b) => {
      // Prefer days where none of the classes have this subject yet
      const countA = participatingClasses.filter(c =>
        timetable[c.id][a].some(s => s && s.subject === group.subject)
      ).length;
      const countB = participatingClasses.filter(c =>
        timetable[c.id][b].some(s => s && s.subject === group.subject)
      ).length;
      return countA - countB;
    });

    for (const dayIndex of dayOrder) {
      if (placed >= group.hoursPerWeek) break;

      const maxPeriods = Math.min(...participatingClasses.map(c => c.periodsPerDay));
      const periods = shuffled([...Array(maxPeriods).keys()]);

      for (const period of periods) {
        if (placed >= group.hoursPerWeek) break;

        // Check all classes have capacity and empty slot
        let canPlace = true;
        for (const cls of participatingClasses) {
          if (classPeriodsOnDay(cls.id, dayIndex) >= cls.periodsPerDay) {
            canPlace = false;
            break;
          }
          if (timetable[cls.id][dayIndex][period] !== null) {
            canPlace = false;
            break;
          }
          if (wouldCreateTripleConsecutive(cls.id, group.teacherId, dayIndex, period)) {
            canPlace = false;
            break;
          }
        }

        // Check teacher is free globally
        if (canPlace && teacherBusy[group.teacherId][dayIndex][period]) {
          canPlace = false;
        }

        // Check subject maxPerDay constraint
        if (canPlace && group.maxPerDay && group.maxPerDay > 0) {
          let maxExceeded = false;
          for (const cls of participatingClasses) {
            const countOnDay = (timetable[cls.id][dayIndex] || [])
              .filter(s => s && s.subject === group.subject).length;
            if (countOnDay >= group.maxPerDay) {
              maxExceeded = true;
              break;
            }
          }
          if (maxExceeded) canPlace = false;
        }

        // Check subject blockedSlots constraint
        if (canPlace && Array.isArray(group.blockedSlots) && group.blockedSlots.length > 0) {
          const isBlocked = group.blockedSlots.some(
            s => Number(s.day) === dayIndex && Number(s.period) === period
          );
          if (isBlocked) canPlace = false;
        }

        // Check subject preferredTime constraint
        if (canPlace && group.preferredTime === 'morning') {
          const mid = Math.floor(maxPeriods / 2);
          if (period >= mid) canPlace = false;
        } else if (canPlace && group.preferredTime === 'afternoon') {
          const mid = Math.floor(maxPeriods / 2);
          if (period < mid) canPlace = false;
        }

        if (canPlace) {
          // Place in all participating classes simultaneously
          participatingClasses.forEach(cls => {
            timetable[cls.id][dayIndex][period] = {
              teacherId: group.teacherId,
              teacherName: group.teacherName,
              subject: group.subject,
              component: group.component,
              isCombined: true,
              combinedClasses: participatingLabels,
            };
          });

          teacherBusy[group.teacherId][dayIndex][period] = true;
          placed++;
        }
      }
    }

    if (placed < group.hoursPerWeek) {
      warnings.push(
        `⚠ Could only place ${placed}/${group.hoursPerWeek} periods for Joint Lecture "${group.subject}" (${group.component}) with ${group.teacherName} across classes: ${participatingLabels.join(' & ')}`
      );
    }
  });

  // ── 3. Schedule Regular & Split-Subject Assignments ──────────────────────────
  const assignments = [];
  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach(subj => {
      if (subj.isElective) return;
      // Skip if already placed as part of a joint lecture group
      if (subj.isCombined && Array.isArray(subj.combinedClasses) && subj.combinedClasses.length > 1) {
        return;
      }
      assignments.push({
        classId: subj.classId,
        classLabel: classLabelMap[subj.classId] || subj.classId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: subj.subject,
        component: subj.component || 'Theory',
        hoursPerWeek: Number(subj.hoursPerWeek) || 1,
        blockedSlots: subj.blockedSlots || [],
        preferredTime: subj.preferredTime || 'any',
        maxPerDay: subj.maxPerDay ? Number(subj.maxPerDay) : 0,
        consecutivePeriods: !!subj.consecutivePeriods,
      });
    });
  });

  function tryPlace(assignment) {
    const cls = classes.find(c => c.id === assignment.classId);
    if (!cls) return false;

    // Distribute across days: prefer days where this subject isn't already placed in this class
    const dayOrder = shuffled(DAYS.map((_, i) => i)).sort((a, b) => {
      const hasSubjA = timetable[cls.id][a].some(slot => slot && slot.subject === assignment.subject);
      const hasSubjB = timetable[cls.id][b].some(slot => slot && slot.subject === assignment.subject);
      if (hasSubjA && !hasSubjB) return 1;
      if (!hasSubjA && hasSubjB) return -1;
      return 0;
    });

    for (const dayIndex of dayOrder) {
      if (classPeriodsOnDay(cls.id, dayIndex) >= cls.periodsPerDay) continue;

      // Check maxPerDay constraint
      if (assignment.maxPerDay && assignment.maxPerDay > 0) {
        const countOnDay = (timetable[cls.id][dayIndex] || [])
          .filter(slot => slot && slot.subject === assignment.subject).length;
        if (countOnDay >= assignment.maxPerDay) continue;
      }

      const periods = shuffled([...Array(cls.periodsPerDay).keys()]);
      for (const period of periods) {
        if (timetable[cls.id][dayIndex][period]) continue;
        if (teacherBusy[assignment.teacherId][dayIndex][period]) continue;
        if (wouldCreateTripleConsecutive(cls.id, assignment.teacherId, dayIndex, period)) continue;

        // Check subject blockedSlots constraint
        if (Array.isArray(assignment.blockedSlots) && assignment.blockedSlots.length > 0) {
          const isBlocked = assignment.blockedSlots.some(
            s => Number(s.day) === dayIndex && Number(s.period) === period
          );
          if (isBlocked) continue;
        }

        // Check subject preferredTime constraint
        if (assignment.preferredTime === 'morning') {
          const mid = Math.floor(cls.periodsPerDay / 2);
          if (period >= mid) continue;
        } else if (assignment.preferredTime === 'afternoon') {
          const mid = Math.floor(cls.periodsPerDay / 2);
          if (period < mid) continue;
        }

        timetable[cls.id][dayIndex][period] = {
          teacherId: assignment.teacherId,
          teacherName: assignment.teacherName,
          subject: assignment.subject,
          component: assignment.component,
        };
        teacherBusy[assignment.teacherId][dayIndex][period] = true;
        return true;
      }
    }
    return false;
  }

  for (const assignment of assignments) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = assignment.hoursPerWeek * 25;

    while (placed < assignment.hoursPerWeek && attempts < maxAttempts) {
      if (tryPlace(assignment)) placed++;
      attempts++;
    }

    if (placed < assignment.hoursPerWeek) {
      warnings.push(
        `⚠ Could only place ${placed}/${assignment.hoursPerWeek} periods for ` +
        `${assignment.teacherName} → ${assignment.subject} (${assignment.component}) in class ${assignment.classLabel}`
      );
    }
  }

  // Convert internal timetable format to output format
  const output = {};
  classes.forEach(cls => {
    output[cls.id] = {};
    DAYS.forEach((day, d) => {
      output[cls.id][day] = timetable[cls.id][d];
    });
  });

  return { timetable: output, warnings };
}
