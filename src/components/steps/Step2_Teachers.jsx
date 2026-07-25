import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, BookOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { COMMON_SUBJECTS, TEACHER_COLORS } from '../../constants';

let teacherIdCounter = 1;

function newTeacher() {
  return {
    id: `t${Date.now()}_${teacherIdCounter++}`,
    name: '',
    subjects: [],
    blockedSlots: [],
  };
}

function newSubjectRow(classes) {
  return {
    classId: classes[0]?.id || '',
    subject: '',
    hoursPerWeek: 3,
  };
}

export default function Step2_Teachers({ classes, teachers, setTeachers, onNext, onBack }) {
  const [expandedId, setExpandedId] = useState(null);

  const addTeacher = () => {
    const t = newTeacher();
    setTeachers(prev => [...prev, t]);
    setExpandedId(t.id);
  };

  const removeTeacher = (id) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateTeacher = (id, field, value) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addSubject = (teacherId) => {
    setTeachers(prev => prev.map(t =>
      t.id === teacherId
        ? { ...t, subjects: [...t.subjects, newSubjectRow(classes)] }
        : t
    ));
  };

  const updateSubject = (teacherId, idx, field, value) => {
    setTeachers(prev => prev.map(t =>
      t.id === teacherId
        ? {
            ...t,
            subjects: t.subjects.map((s, i) =>
              i === idx ? { ...s, [field]: field === 'hoursPerWeek' ? Number(value) : value } : s
            ),
          }
        : t
    ));
  };

  const removeSubject = (teacherId, idx) => {
    setTeachers(prev => prev.map(t =>
      t.id === teacherId
        ? { ...t, subjects: t.subjects.filter((_, i) => i !== idx) }
        : t
    ));
  };

  const totalAssignments = teachers.reduce((sum, t) => sum + t.subjects.length, 0);
  const totalHours = teachers.reduce((sum, t) =>
    sum + t.subjects.reduce((s2, subj) => s2 + (subj.hoursPerWeek || 0), 0), 0
  );

  const canProceed = teachers.length > 0 && teachers.every(t => t.name.trim() !== '');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/40 border border-brand-700/40 text-brand-300 text-sm font-medium">
          <Users size={14} />
          Step 2 of 4
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Teachers & Subjects</h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Add teaching staff, assign subjects to specific classes, and set weekly hour quotas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Teachers', value: teachers.length },
          { label: 'Assignments', value: totalAssignments },
          { label: 'Total Hours/Week', value: totalHours },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Teacher List */}
      <div className="space-y-3">
        {teachers.map((teacher, idx) => {
          const color = TEACHER_COLORS[idx % TEACHER_COLORS.length];
          const isExpanded = expandedId === teacher.id;

          return (
            <div key={teacher.id} className={`glass-card border ${color.border} overflow-hidden`}>
              {/* Teacher Header Row */}
              <div className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color.bg} ${color.text} border ${color.border}`}>
                  {idx + 1}
                </div>
                <input
                  type="text"
                  value={teacher.name}
                  onChange={e => updateTeacher(teacher.id, 'name', e.target.value)}
                  placeholder="Teacher name..."
                  className="input-field flex-1 text-sm font-medium"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:block">
                  {teacher.subjects.length} subject{teacher.subjects.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  onClick={() => removeTeacher(teacher.id)}
                  className="btn-danger px-3 py-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded Subject Rows */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <BookOpen size={14} className="text-brand-400" />
                      Subject Assignments
                    </span>
                    <button
                      onClick={() => addSubject(teacher.id)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      <Plus size={12} /> Add Subject
                    </button>
                  </div>

                  {teacher.subjects.length === 0 && (
                    <p className="text-sm text-slate-500 italic text-center py-3">
                      No subjects assigned. Click "Add Subject" to assign one.
                    </p>
                  )}

                  {teacher.subjects.map((subj, sIdx) => (
                    <div key={sIdx} className="grid grid-cols-12 gap-2 items-end">
                      {/* Class */}
                      <div className="col-span-4">
                        {sIdx === 0 && <label className="label text-xs">Class</label>}
                        <div className="relative">
                          <select
                            value={subj.classId}
                            onChange={e => updateSubject(teacher.id, sIdx, 'classId', e.target.value)}
                            className="select-field text-xs pr-8"
                          >
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.id}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="col-span-5">
                        {sIdx === 0 && <label className="label text-xs">Subject</label>}
                        <input
                          type="text"
                          list={`subjects-${teacher.id}-${sIdx}`}
                          value={subj.subject}
                          onChange={e => updateSubject(teacher.id, sIdx, 'subject', e.target.value)}
                          placeholder="Subject name..."
                          className="input-field text-xs"
                        />
                        <datalist id={`subjects-${teacher.id}-${sIdx}`}>
                          {COMMON_SUBJECTS.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </div>

                      {/* Hours */}
                      <div className="col-span-2">
                        {sIdx === 0 && <label className="label text-xs">Hrs/Wk</label>}
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={subj.hoursPerWeek}
                          onChange={e => updateSubject(teacher.id, sIdx, 'hoursPerWeek', e.target.value)}
                          className="input-field text-xs text-center"
                        />
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex items-end">
                        <button
                          onClick={() => removeSubject(teacher.id, sIdx)}
                          className="btn-danger px-2 py-2 w-full justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Teacher Button */}
      <button
        onClick={addTeacher}
        className="w-full glass-card border-dashed border-slate-600 hover:border-brand-500 
                   hover:bg-brand-950/20 transition-all duration-200 p-4 flex items-center 
                   justify-center gap-2 text-slate-400 hover:text-brand-300 text-sm font-medium"
      >
        <UserPlus size={18} />
        Add Teacher
      </button>

      {!canProceed && teachers.length > 0 && (
        <p className="text-sm text-amber-400 text-center">
          ⚠ Please fill in all teacher names before proceeding.
        </p>
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
