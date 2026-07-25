import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, BookOpen, ChevronDown, ChevronUp, Users, AlertCircle } from 'lucide-react';
import { TEACHER_COLORS } from '../../constants';

let teacherIdCounter = 1;

function newTeacher() {
  return {
    id: `t${Date.now()}_${teacherIdCounter++}`,
    name: '',
    subjects: [],
    blockedSlots: [],
  };
}

function emptyAssignment(classes) {
  return { classId: classes[0]?.id || '', subjectId: '' };
}

export default function Step3_Teachers({ classes, subjects, teachers, setTeachers, onNext, onBack }) {
  const [expandedId, setExpandedId] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  /** Get subject object by id (resolving nested electives) */
  const getSubject = (id) => {
    if (!id) return null;
    const parts = id.split('::');
    const baseId = parts[0];
    const baseSubj = subjects.find(s => s.id === baseId);
    if (!baseSubj) return null;

    if (parts[1] === 'primary') {
      return { id, name: baseSubj.name, hoursPerWeek: baseSubj.hoursPerWeek, isElective: true };
    } else if (parts[1] === 'elective') {
      const idx = Number(parts[2]);
      const elName = baseSubj.electiveSubjects?.[idx] || '';
      return { id, name: elName, hoursPerWeek: baseSubj.hoursPerWeek, isElective: true };
    }
    return baseSubj; // normal subject
  };

  /** Flatten subjects of a class, expanding electives into multiple options */
  const subjectsForClass = (classId) => {
    const list = [];
    subjects.filter(s => s.classId === classId).forEach(s => {
      if (s.isElective) {
        list.push({ id: `${s.id}::primary`, name: s.name, hoursPerWeek: s.hoursPerWeek, isElective: true });
        (s.electiveSubjects || []).forEach((elName, idx) => {
          if (elName.trim()) {
            list.push({ id: `${s.id}::elective::${idx}`, name: elName.trim(), hoursPerWeek: s.hoursPerWeek, isElective: true });
          }
        });
      } else {
        list.push(s);
      }
    });
    return list;
  };

  /**
   * Returns subjects for a class that haven't been claimed by ANY assignment row
   * across ALL teachers — EXCEPT the current row.
   */
  const getAvailableSubjects = (currentTeacherId, currentAIdx, classId) => {
    const taken = new Set();
    teachers.forEach(t => {
      t.subjects.forEach((a, aIdx) => {
        if (t.id === currentTeacherId && aIdx === currentAIdx) return;
        if (a.subjectId) taken.add(`${a.classId}::${a.subjectId}`);
      });
    });
    return subjectsForClass(classId).filter(s => !taken.has(`${classId}::${s.id}`));
  };

  // ── Teacher CRUD ───────────────────────────────────────────────────────────
  const addTeacher = () => {
    const t = newTeacher();
    setTeachers(prev => [...prev, t]);
    setExpandedId(t.id); // auto-expand
  };

  const removeTeacher = (id) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
  };

  const updateTeacher = (id, field, value) => {
    setTeachers(prev => prev.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  // ── Assignment CRUD ────────────────────────────────────────────────────────
  const addAssignment = (teacherId) => {
    setTeachers(prev => prev.map(t => {
      if (t.id !== teacherId) return t;
      return {
        ...t,
        subjects: [...t.subjects, emptyAssignment(classes)],
      };
    }));
  };

  const removeAssignment = (teacherId, index) => {
    setTeachers(prev => prev.map(t => {
      if (t.id !== teacherId) return t;
      return {
        ...t,
        subjects: t.subjects.filter((_, i) => i !== index),
      };
    }));
  };

  const updateAssignment = (teacherId, index, field, value) => {
    setTeachers(prev => prev.map(t => {
      if (t.id !== teacherId) return t;
      const updatedSubjects = t.subjects.map((asgn, i) => {
        if (i !== index) return asgn;
        const copy = { ...asgn, [field]: value };
        if (field === 'classId') {
          // Reset subjectId if class changes to avoid mismatch
          copy.subjectId = '';
        }
        return copy;
      });
      return { ...t, subjects: updatedSubjects };
    }));
  };

  // ── Duplicate teacher name detection ─────────────────────────────────────
  const teacherNameCounts = {};
  teachers.forEach(t => {
    const key = t.name.trim().toLowerCase();
    if (key) teacherNameCounts[key] = (teacherNameCounts[key] || 0) + 1;
  });
  const isDupTeacherName = (name) => {
    const key = name.trim().toLowerCase();
    return key && teacherNameCounts[key] > 1;
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalAssignments = teachers.reduce((sum, t) => sum + t.subjects.length, 0);
  const totalHours = teachers.reduce((sum, t) =>
    sum + t.subjects.reduce((s2, a) => {
      const subj = getSubject(a.subjectId);
      return s2 + (subj?.hoursPerWeek || 0);
    }, 0), 0
  );

  const hasDupTeacherNames = Object.values(teacherNameCounts).some(v => v > 1);
  const canProceed = (
    teachers.length > 0 &&
    teachers.every(t => t.name.trim() !== '') &&
    !hasDupTeacherNames &&
    // No teacher has a duplicate (classId+subjectId) pair
    teachers.every(t => {
      const seen = new Set();
      return t.subjects.every(a => {
        const key = `${a.classId}::${a.subjectId}`;
        if (!a.subjectId) return true; // unselected, handled separately
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <Users size={13} />
          Step 3 of 5
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Teaching Staff</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Add teaching staff and assign them to the subjects you defined in the previous step.
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Teachers',        value: teachers.length,    color: 'text-blue-600' },
          { label: 'Assignments',     value: totalAssignments,  color: 'text-indigo-600' },
          { label: 'Hours / Week',    value: totalHours,        color: 'text-sky-600' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center bg-white border border-slate-200">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Teacher cards ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {teachers.map((teacher, idx) => {
          const color      = TEACHER_COLORS[idx % TEACHER_COLORS.length];
          const isExpanded = expandedId === teacher.id;

          return (
            <div key={teacher.id} className="glass-card bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              {/* ── Teacher header row ── */}
              <div className="flex items-center gap-3 p-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color.bg} ${color.text} border ${color.border}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 flex flex-col">
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={e => updateTeacher(teacher.id, 'name', e.target.value)}
                    placeholder="Teacher name…"
                    className={`input-field text-sm py-2 ${
                      isDupTeacherName(teacher.name)
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                        : ''
                    }`}
                  />
                  {isDupTeacherName(teacher.name) && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                      <AlertCircle size={11} /> Duplicate teacher name
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:block">
                  {teacher.subjects.length} assignment{teacher.subjects.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                  className="btn-secondary px-3 py-2 text-xs flex items-center gap-1"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={() => removeTeacher(teacher.id)} className="btn-danger px-3 py-2">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* ── Expanded assignments ── */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={13} className="text-blue-500" />
                      Subject Assignments
                    </span>
                    <button onClick={() => addAssignment(teacher.id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                      <Plus size={12} /> Assign Subject
                    </button>
                  </div>

                  {teacher.subjects.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-xl border border-slate-200/60 border-dashed">
                      No assignments yet. Click "Assign Subject" to add one.
                    </p>
                  )}

                  {teacher.subjects.map((asgn, aIdx) => {
                    const availableSubjects = getAvailableSubjects(teacher.id, aIdx, asgn.classId);
                    const chosenSubject     = getSubject(asgn.subjectId);
                    const isDupAsgn = asgn.subjectId && teacher.subjects.filter(
                      (a, i) => i !== aIdx && a.classId === asgn.classId && a.subjectId === asgn.subjectId
                    ).length > 0;

                    return (
                      <div key={aIdx} className={`grid grid-cols-12 gap-2 items-start p-2 rounded-xl border border-transparent ${isDupAsgn ? 'bg-red-50 border-red-100' : ''}`}>
                        {/* Class dropdown */}
                        <div className="col-span-4">
                          {aIdx === 0 && <label className="label text-[10px] font-bold text-slate-400 uppercase">Class</label>}
                          <div className="relative">
                            <select
                              value={asgn.classId}
                              onChange={e => updateAssignment(teacher.id, aIdx, 'classId', e.target.value)}
                              className="select-field text-xs pr-8"
                            >
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Subject dropdown */}
                        <div className="col-span-6">
                          {aIdx === 0 && <label className="label text-[10px] font-bold text-slate-400 uppercase">Subject</label>}
                          <div className="relative">
                            <select
                              value={asgn.subjectId}
                              onChange={e => updateAssignment(teacher.id, aIdx, 'subjectId', e.target.value)}
                              className={`select-field text-xs pr-8 ${
                                isDupAsgn
                                  ? 'border-red-300'
                                  : !asgn.subjectId
                                  ? 'border-amber-300 text-slate-400'
                                  : ''
                              }`}
                            >
                              <option value="">— select subject —</option>
                              {availableSubjects.length === 0 && (
                                <option disabled>No subjects for this class</option>
                              )}
                              {availableSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.hoursPerWeek} hrs/wk)
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                          {isDupAsgn && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                              <AlertCircle size={11} /> Already assigned to this teacher
                            </p>
                          )}
                        </div>

                        {/* Hours badge */}
                        <div className="col-span-1 flex items-start justify-center pt-0.5">
                          <span className={`
                            text-xs font-bold rounded-lg px-2 py-2 text-center whitespace-nowrap border
                            ${chosenSubject
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                              : 'bg-slate-100 text-slate-400 border-slate-200'}
                          `}>
                            {chosenSubject ? `${chosenSubject.hoursPerWeek}h` : '—'}
                          </span>
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex items-start pt-0.5">
                          <button
                            onClick={() => removeAssignment(teacher.id, aIdx)}
                            className="btn-danger px-2 py-2 w-full justify-center"
                          >
                            <Trash2 size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Warn if any assignment has no subject selected */}
                  {teacher.subjects.some(a => !a.subjectId) && (
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl text-xs font-semibold">
                      <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                      Select a subject for every assignment row.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add teacher button ──────────────────────────────────────────────── */}
      <button
        onClick={addTeacher}
        className="w-full bg-white border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20
                   transition-all duration-200 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-semibold"
      >
        <UserPlus size={16} />
        Add Teacher
      </button>

      {!canProceed && teachers.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl text-xs font-semibold max-w-xs mx-auto">
          <AlertCircle size={14} className="text-amber-500" />
          Please fill in all teacher names to proceed.
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} disabled={!canProceed} className="btn-primary">
          Continue to Constraints →
        </button>
      </div>
    </div>
  );
}
