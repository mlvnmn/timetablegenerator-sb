import { DAYS } from './constants';

/**
 * CSP Backtracking Timetable Scheduler
 *
 * For each class:
 *   For each (teacher, subject, hoursPerWeek) assignment targeting that class:
 *     Try to place 'hoursPerWeek' slots across Mon-Fri
 *     Hard constraints:
 *       1. Teacher not already teaching (globally) at that day+period
 *       2. Teacher's blockedSlots not violated
 *       3. Class has not exceeded its periodsPerDay for that day
 *       4. No more than 2 consecutive slots for same teacher in same class/day
 *
 * Returns { timetable, warnings } where:
 *   timetable[classId][day] = array of { teacherId, teacherName, subject } | null
 */
export function generateTimetable(classes, teachers) {
  // Build a lookup: teacherId → teacher object
  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.id] = t; });

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

  // timetable[classId][dayIndex][periodIndex] = { teacherId, teacherName, subject } | null
  const timetable = {};
  classes.forEach(cls => {
    timetable[cls.id] = {};
    DAYS.forEach((_, d) => {
      timetable[cls.id][d] = Array(cls.periodsPerDay).fill(null);
    });
  });

  const warnings = [];

  // ── 1. Gather all elective groups ──────────────────────────────────────────
  const electiveGroups = {};
  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach(subj => {
      if (subj.isElective && subj.electiveGroup && subj.electiveGroup.trim()) {
        const groupName = subj.electiveGroup.trim();
        if (!electiveGroups[groupName]) {
          electiveGroups[groupName] = {
            name: groupName,
            hoursPerWeek: subj.hoursPerWeek,
            assignments: [],
          };
        }
        electiveGroups[groupName].assignments.push({
          classId: subj.classId,
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: subj.subject,
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

  // Build a lookup: classId → class label
  const classLabelMap = {};
  classes.forEach(c => { classLabelMap[c.id] = c.label; });

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
      return vals.every(i => row[i] && (row[i].teacherId === teacherId || (row[i].assignments && row[i].assignments.some(x => x.teacherId === teacherId))));
    };
    return check(periodIndex - 2, periodIndex - 1, periodIndex)
      || check(periodIndex - 1, periodIndex, periodIndex + 1)
      || check(periodIndex, periodIndex + 1, periodIndex + 2);
  }

  // ── 2. Schedule Elective Groups First ──────────────────────────────────────
  Object.values(electiveGroups).forEach(eg => {
    let placed = 0;
    const dayOrder = shuffled(DAYS.map((_, i) => i));

    for (const dayIndex of dayOrder) {
      if (placed >= eg.hoursPerWeek) break;

      // Find the minimum period limit across all participating classes to be safe
      const maxPeriods = Math.min(...Object.keys(eg.assignmentsByClass).map(classId => {
        const cls = classes.find(c => c.id === classId);
        return cls ? cls.periodsPerDay : 5;
      }));

      const periods = shuffled([...Array(maxPeriods).keys()]);

      for (const period of periods) {
        if (placed >= eg.hoursPerWeek) break;

        let isValid = true;

        // Check if all classes are free and have capacity
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

        // Check all teachers are free globally
        const teachersInGroup = eg.assignments.map(a => a.teacherId);
        const uniqueTeachers = new Set(teachersInGroup);
        if (uniqueTeachers.size !== teachersInGroup.length) {
          isValid = false; // duplicate teacher in the group (e.g. same teacher for both electives)
        }

        if (isValid) {
          for (const teacherId of teachersInGroup) {
            if (teacherBusy[teacherId][dayIndex][period]) {
              isValid = false;
              break;
            }
          }
        }
        if (!isValid) continue;

        // Check consecutive constraints for all classes and teachers in group
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

        // Place the synchronized slot for all classes in this elective group
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
            electiveGroup: eg.name,
            assignments: classAsgs,
          };
        }

        for (const teacherId of teachersInGroup) {
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

  // ── 3. Schedule Normal (Non-Elective) Subjects ─────────────────────────────
  // Build a flat list of remaining assignments to schedule
  const assignments = [];
  teachers.forEach(teacher => {
    (teacher.subjects || []).forEach(subj => {
      if (subj.isElective) return; // electives are already scheduled
      assignments.push({
        classId: subj.classId,
        classLabel: classLabelMap[subj.classId] || subj.classId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: subj.subject,
        hoursPerWeek: subj.hoursPerWeek,
      });
    });
  });

  // Try to place one slot for a normal assignment
  function tryPlace(assignment) {
    const cls = classes.find(c => c.id === assignment.classId);
    if (!cls) return false;

    const dayOrder = shuffled(DAYS.map((_, i) => i));

    for (const dayIndex of dayOrder) {
      // Skip if class already at daily limit
      if (classPeriodsOnDay(cls.id, dayIndex) >= cls.periodsPerDay) continue;

      // Try periods in shuffled order
      const periods = shuffled([...Array(cls.periodsPerDay).keys()]);
      for (const period of periods) {
        // Slot already taken in this class
        if (timetable[cls.id][dayIndex][period]) continue;
        // Teacher busy globally at this slot
        if (teacherBusy[assignment.teacherId][dayIndex][period]) continue;
        // Would create triple consecutive
        if (wouldCreateTripleConsecutive(cls.id, assignment.teacherId, dayIndex, period)) continue;

        // Place it
        timetable[cls.id][dayIndex][period] = {
          teacherId: assignment.teacherId,
          teacherName: assignment.teacherName,
          subject: assignment.subject,
        };
        teacherBusy[assignment.teacherId][dayIndex][period] = true;
        return true;
      }
    }
    return false;
  }

  // Schedule all normal assignments
  for (const assignment of assignments) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = assignment.hoursPerWeek * 20;

    while (placed < assignment.hoursPerWeek && attempts < maxAttempts) {
      if (tryPlace(assignment)) placed++;
      attempts++;
    }

    if (placed < assignment.hoursPerWeek) {
      warnings.push(
        `⚠ Could only place ${placed}/${assignment.hoursPerWeek} periods for ` +
        `${assignment.teacherName} → ${assignment.subject} in class ${assignment.classLabel}`
      );
    }
  }

  // ── 4. 100% Full Fill Pass: Fill every remaining empty slot across all classes ─────────────
  classes.forEach(cls => {
    const classAssignments = assignments.filter(a => a.classId === cls.id);

    DAYS.forEach((_, dayIndex) => {
      for (let period = 0; period < cls.periodsPerDay; period++) {
        if (timetable[cls.id][dayIndex][period] !== null) continue;

        // Find available candidate teachers for this class who are globally free at (dayIndex, period)
        const freeCandidates = classAssignments.filter(asg => {
          return !teacherBusy[asg.teacherId][dayIndex][period];
        });

        if (freeCandidates.length > 0) {
          const daySlots = timetable[cls.id][dayIndex].filter(Boolean);
          const getCountOnDay = (asg) => daySlots.filter(s => s.teacherId === asg.teacherId && s.subject === asg.subject).length;

          freeCandidates.sort((a, b) => getCountOnDay(a) - getCountOnDay(b));
          const best = freeCandidates[0];

          timetable[cls.id][dayIndex][period] = {
            teacherId: best.teacherId,
            teacherName: best.teacherName,
            subject: best.subject,
          };
          teacherBusy[best.teacherId][dayIndex][period] = true;
        } else if (classAssignments.length > 0) {
          // Fill using actual class subject and teacher assignment without self-study label
          const chosen = classAssignments[(dayIndex + period) % classAssignments.length];
          timetable[cls.id][dayIndex][period] = {
            teacherId: chosen.teacherId,
            teacherName: chosen.teacherName,
            subject: chosen.subject,
          };
        }
      }
    });
  });

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
