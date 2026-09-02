import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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
    return baseSubj;
  };

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
    setExpandedId(t.id);
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

  const hasDupTeacherNames = Object.values(teacherNameCounts).some(v => v > 1);
  const canProceed = (
    teachers.length > 0 &&
    teachers.every(t => t.name.trim() !== '') &&
    !hasDupTeacherNames &&
    teachers.every(t => {
      const seen = new Set();
      return t.subjects.every(a => {
        const key = `${a.classId}::${a.subjectId}`;
        if (!a.subjectId) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#243b4a]/10 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Teaching Staff</h2>
          <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
            Add faculty members and assign them to class subjects.
          </p>
        </div>
        <button onClick={addTeacher} className="btn-primary text-xs">
          <UserPlus size={14} /> Add Staff Member
        </button>
      </div>

      {/* Teacher cards */}
      <div className="space-y-3">
        {teachers.map((teacher, idx) => {
          const color      = TEACHER_COLORS[idx % TEACHER_COLORS.length];
          const isExpanded = expandedId === teacher.id;

          return (
            <div key={teacher.id} className="bg-white border border-[#243b4a]/15 rounded-xl overflow-hidden shadow-2xs">
              {/* Teacher header row */}
              <div className="flex items-center gap-3 p-3">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color.indicator || 'bg-[#243b4a]'}`} />
                <div className="flex-1">
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={e => updateTeacher(teacher.id, 'name', e.target.value)}
                    placeholder="e.g. Dr. Alan Turing"
                    className={`input-field text-xs py-1.5 font-extrabold ${
                      isDupTeacherName(teacher.name) ? 'border-rose-300' : ''
                    }`}
                  />
                </div>
                <span className="text-xs text-[#243b4a]/60 font-bold whitespace-nowrap hidden sm:block">
                  {teacher.subjects.length} assignment{teacher.subjects.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                  className="btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1 font-bold"
                >
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button onClick={() => removeTeacher(teacher.id)} className="btn-danger p-1.5">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded assignments */}
              {isExpanded && (
                <div className="border-t border-[#243b4a]/10 bg-[#243b4a]/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#243b4a]">Assigned Subjects</span>
                    <button onClick={() => addAssignment(teacher.id)} className="btn-secondary text-xs py-1 px-2.5 font-bold">
                      <Plus size={12} /> Assign Subject
                    </button>
                  </div>

                  {teacher.subjects.length === 0 && (
                    <p className="text-xs text-[#243b4a]/50 italic text-center py-4 bg-white rounded-lg border border-[#243b4a]/10 font-medium">
                      No subject assignments yet — click "+ Assign Subject" to map classes.
                    </p>
                  )}

                  {teacher.subjects.map((asgn, aIdx) => {
                    const availableSubjects = getAvailableSubjects(teacher.id, aIdx, asgn.classId);
                    const chosenSubject     = getSubject(asgn.subjectId);
                    const isDupAsgn = asgn.subjectId && teacher.subjects.filter(
                      (a, i) => i !== aIdx && a.classId === asgn.classId && a.subjectId === asgn.subjectId
                    ).length > 0;

                    return (
                      <div key={aIdx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${isDupAsgn ? 'bg-rose-50 border-rose-200' : 'bg-white border-[#243b4a]/15'}`}>
                        {/* Class dropdown */}
                        <div className="col-span-4">
                          <div className="relative">
                            <select
                              value={asgn.classId}
                              onChange={e => updateAssignment(teacher.id, aIdx, 'classId', e.target.value)}
                              className="select-field text-xs py-1.5 pr-6 font-bold"
                            >
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                          </div>
                        </div>

                        {/* Subject dropdown */}
                        <div className="col-span-6">
                          <div className="relative">
                            <select
                              value={asgn.subjectId}
                              onChange={e => updateAssignment(teacher.id, aIdx, 'subjectId', e.target.value)}
                              className={`select-field text-xs py-1.5 pr-6 font-bold ${isDupAsgn ? 'border-rose-300 text-rose-700' : ''}`}
                            >
                              <option value="">— select subject —</option>
                              {availableSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.hoursPerWeek} hrs/wk)
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                          </div>
                        </div>

                        {/* Hours badge */}
                        <div className="col-span-1 text-center">
                          <span className="text-xs font-black text-[#243b4a]">
                            {chosenSubject ? `${chosenSubject.hoursPerWeek}h` : '—'}
                          </span>
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex justify-center">
                          <button onClick={() => removeAssignment(teacher.id, aIdx)} className="btn-danger p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!canProceed && teachers.length > 0 && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg text-xs font-bold">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          Fill in all teacher names and ensure valid subject mappings before continuing.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} disabled={!canProceed} className="btn-primary">
          Continue to Constraints →
        </button>
      </div>
    </div>
  );
}
