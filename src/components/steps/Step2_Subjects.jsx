import React from 'react';
import { Plus, Trash2, BookOpen, AlertCircle, Layers } from 'lucide-react';

function generateId() {
  return `subj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptySubject(classId) {
  return { id: generateId(), classId, name: '', hoursPerWeek: 3, isElective: false, electiveSubjects: [] };
}

export default function Step2_Subjects({ classes, subjects, setSubjects, onNext, onBack }) {
  const byClass = (classId) => subjects.filter(s => s.classId === classId);

  const addSubject = (classId) => {
    setSubjects(prev => [...prev, emptySubject(classId)]);
  };

  const removeSubject = (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const updateSubject = (id, field, value) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        const updated = {
          ...s,
          [field]: field === 'hoursPerWeek' ? Math.max(1, Number(value)) : field === 'isElective' ? Boolean(value) : value
        };
        if (field === 'isElective') {
          if (value) {
            updated.electiveSubjects = updated.electiveSubjects && updated.electiveSubjects.length > 0 ? updated.electiveSubjects : [''];
          } else {
            updated.electiveSubjects = [];
          }
        }
        return updated;
      })
    );
  };

  const copySubjects = (sourceClassId, targetClassId) => {
    const sourceSubjects = subjects.filter(s => s.classId === sourceClassId);
    if (sourceSubjects.length === 0) {
      alert("Source class has no subjects to copy!");
      return;
    }
    const targetSubjects = subjects.filter(s => s.classId === targetClassId);
    if (
      targetSubjects.length > 0 &&
      !confirm("Overwrite existing subjects in this class with subjects from the selected class?")
    ) {
      return;
    }

    // Generate new copies with fresh IDs
    const copies = sourceSubjects.map(s => ({
      id: generateId(),
      classId: targetClassId,
      name: s.name,
      hoursPerWeek: s.hoursPerWeek,
      isElective: s.isElective || false,
      electiveSubjects: s.electiveSubjects ? [...s.electiveSubjects] : [],
    }));

    setSubjects(prev => {
      const filtered = prev.filter(s => s.classId !== targetClassId);
      return [...filtered, ...copies];
    });
  };

  // ── Duplicate detection per class (flat mapped elective names) ────────────────
  const getActiveNamesForClass = (classId) => {
    const names = [];
    byClass(classId).forEach(s => {
      if (s.name.trim()) names.push(s.name.trim().toLowerCase());
      if (s.isElective && s.electiveSubjects) {
        s.electiveSubjects.forEach(name => {
          if (name.trim()) names.push(name.trim().toLowerCase());
        });
      }
    });
    return names;
  };

  const dupNamesByClass = {}; // classId -> Set of duplicate lowercase names
  let hasGlobalDuplicates = false;
  classes.forEach(cls => {
    const names = getActiveNamesForClass(cls.id);
    const counts = {};
    names.forEach(n => counts[n] = (counts[n] || 0) + 1);
    const dups = new Set(Object.keys(counts).filter(n => counts[n] > 1));
    if (dups.size > 0) {
      dupNamesByClass[cls.id] = dups;
      hasGlobalDuplicates = true;
    }
  });

  const isDuplicate = (classId, name) => {
    const key = name.trim().toLowerCase();
    return key && dupNamesByClass[classId] && dupNamesByClass[classId].has(key);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const hasEmptyNames = subjects.some(s => {
    if (!s.name.trim()) return true;
    if (s.isElective) {
      return (s.electiveSubjects || []).some(name => !name.trim());
    }
    return false;
  });

  const canProceed = subjects.length > 0 && !hasEmptyNames && !hasGlobalDuplicates;

  const totalSubjects = subjects.reduce((sum, s) => {
    let count = 1;
    if (s.isElective && s.electiveSubjects) {
      count += s.electiveSubjects.length;
    }
    return sum + count;
  }, 0);

  const totalHours = subjects.reduce((sum, s) => sum + (s.hoursPerWeek || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <BookOpen size={13} />
          Step 2 of 5
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Subjects Management</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Type in all subjects for each class. Mark a subject as Elective to add parallel subjects (e.g. Data Science running with Machine Learning).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Classes',          value: classes.length, color: 'text-blue-600'  },
          { label: 'Total Subjects',   value: totalSubjects,  color: 'text-indigo-600' },
          { label: 'Total Hrs / Week', value: totalHours,     color: 'text-sky-600'    },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center bg-white border border-slate-200">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-class sections */}
      {classes.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-500 bg-white border border-slate-200">
          No classes configured. Go back to Step 1 to add classes first.
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => {
            const classSubjects = byClass(cls.id);
            const classHours    = classSubjects.reduce((sum, s) => sum + (s.hoursPerWeek || 0), 0);
            const classHasDup   = dupNamesByClass[cls.id] && dupNamesByClass[cls.id].size > 0;

            return (
              <div key={cls.id} className={`glass-card overflow-hidden bg-white border ${classHasDup ? 'border-red-300' : 'border-slate-200'}`}>
                {/* Class header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/50 flex items-center justify-center flex-shrink-0">
                      <Layers size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{cls.label}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {classSubjects.length} row{classSubjects.length !== 1 ? 's' : ''} · {classHours} hrs/week
                        {classHasDup && <span className="text-red-500 ml-2">· duplicate names!</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {classes.filter(other => other.id !== cls.id).length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Copy from:</span>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              copySubjects(val, cls.id);
                              e.target.value = ""; // Reset
                            }
                          }}
                          className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">— select class —</option>
                          {classes
                            .filter(other => other.id !== cls.id)
                            .map(other => (
                              <option key={other.id} value={other.id}>
                                {other.label}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => addSubject(cls.id)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      <Plus size={12} /> Add Subject
                    </button>
                  </div>
                </div>

                {/* Subject rows */}
                {classSubjects.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-400 text-xs italic bg-white">
                    No subjects yet — click "Add Subject" above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="col-span-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Name</div>
                      <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</div>
                      <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Hrs / Week</div>
                      <div className="col-span-1" />
                    </div>

                    {classSubjects.map(subj => {
                      const isMainDup = isDuplicate(cls.id, subj.name);
                      const isMainEmpty = !subj.name.trim();
                      const isRowError = isMainDup || isMainEmpty || (subj.isElective && (subj.electiveSubjects || []).some(n => !n.trim() || isDuplicate(cls.id, n)));

                      return (
                        <div key={subj.id} className={`
                          grid grid-cols-12 gap-3 items-start px-4 py-3 group.row
                          hover:bg-slate-50/40 transition-colors
                          ${isRowError ? 'bg-red-50/30' : ''}
                        `}>
                          {/* Subject Inputs Column */}
                          <div className="col-span-5 space-y-2">
                            {/* Primary Subject */}
                            <div>
                              <input
                                type="text"
                                value={subj.name}
                                onChange={e => updateSubject(subj.id, 'name', e.target.value)}
                                placeholder="Type subject name…"
                                autoComplete="off"
                                className={`
                                  input-field text-sm py-2
                                  ${isMainDup ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
                                  ${isMainEmpty && !isMainDup ? 'border-amber-300' : ''}
                                `}
                              />
                              {isMainDup && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                                  <AlertCircle size={11} /> Duplicate in this class
                                </p>
                              )}
                            </div>

                            {/* Nested Elective Subjects */}
                            {subj.isElective && (
                              <div className="space-y-2 mt-2">
                                {(subj.electiveSubjects || []).map((elName, elIdx) => {
                                  const isElDup = isDuplicate(cls.id, elName);
                                  const isElEmpty = !elName.trim();
                                  return (
                                    <div key={elIdx} className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={elName}
                                          onChange={e => {
                                            const updated = [...(subj.electiveSubjects || [])];
                                            updated[elIdx] = e.target.value;
                                            updateSubject(subj.id, 'electiveSubjects', updated);
                                          }}
                                          placeholder={`Elective subject ${elIdx + 2} name…`}
                                          autoComplete="off"
                                          className={`
                                            input-field text-sm py-2 flex-1
                                            ${isElDup ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
                                            ${isElEmpty && !isElDup ? 'border-amber-300' : ''}
                                          `}
                                        />
                                        <button
                                          onClick={() => {
                                            const updated = (subj.electiveSubjects || []).filter((_, i) => i !== elIdx);
                                            updateSubject(subj.id, 'electiveSubjects', updated);
                                          }}
                                          className="text-xs text-slate-400 hover:text-red-500 p-1 font-bold"
                                          title="Remove this elective subject"
                                        >
                                          &times;
                                        </button>
                                      </div>
                                      {isElDup && (
                                        <p className="text-xs text-red-500 flex items-center gap-1 font-semibold">
                                          <AlertCircle size={10} /> Duplicate name
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}

                                <button
                                  onClick={() => {
                                    const updated = [...(subj.electiveSubjects || []), ''];
                                    updateSubject(subj.id, 'electiveSubjects', updated);
                                  }}
                                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 mt-1"
                                >
                                  + Add Another Elective Subject
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Type Column */}
                          <div className="col-span-3 pt-2.5">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                              <input
                                type="checkbox"
                                checked={!!subj.isElective}
                                onChange={e => updateSubject(subj.id, 'isElective', e.target.checked)}
                                className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/20 focus:ring-offset-white"
                              />
                              <span>Elective Group</span>
                            </label>
                          </div>

                          {/* Hours Column */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={subj.hoursPerWeek}
                              onChange={e => updateSubject(subj.id, 'hoursPerWeek', e.target.value)}
                              className="input-field text-sm py-2 text-center font-bold"
                            />
                            {subj.isElective && (
                              <p className="text-[9px] text-slate-400 text-center mt-1 font-semibold uppercase tracking-wider">
                                Shared hours
                              </p>
                            )}
                          </div>

                          {/* Delete Column */}
                          <div className="col-span-1 flex justify-center pt-2">
                            <button
                              onClick={() => removeSubject(subj.id)}
                              className="p-1 rounded-lg text-slate-300 hover:text-red-500
                                         hover:bg-slate-50 transition-all duration-150"
                              title="Remove subject"
                            >
                              <Trash2 size={14} />
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
      )}

      {/* Global validation hints */}
      {hasGlobalDuplicates && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-semibold">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          Remove duplicate subject names within the same class before continuing.
        </div>
      )}
      {!hasGlobalDuplicates && hasEmptyNames && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl text-xs font-semibold">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          Fill in all subject names (including nested electives) before continuing.
        </div>
      )}
      {subjects.length === 0 && classes.length > 0 && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl text-xs font-semibold">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          Add at least one subject to continue.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} disabled={!canProceed} className="btn-primary">
          Continue to Teachers →
        </button>
      </div>
    </div>
  );
}
