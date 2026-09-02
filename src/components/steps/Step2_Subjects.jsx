import React from 'react';
import { Plus, Trash2, AlertCircle, Copy } from 'lucide-react';

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
      alert("Selected class has no subjects to copy!");
      return;
    }
    const targetSubjects = subjects.filter(s => s.classId === targetClassId);
    if (
      targetSubjects.length > 0 &&
      !confirm("Overwrite existing subjects in this class with subjects from the selected class?")
    ) {
      return;
    }

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

  // ── Duplicate detection ───────────────────────────────────────────────────
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

  const dupNamesByClass = {};
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

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="border-b border-[#243b4a]/10 pb-4">
        <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Subjects Management</h2>
        <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
          Define weekly subject hours per class. Enable Elective Group for parallel running courses.
        </p>
      </div>

      {/* Per-class sections */}
      {classes.length === 0 ? (
        <div className="bg-white border border-[#243b4a]/15 rounded-xl p-8 text-center text-xs text-[#243b4a]/60 font-semibold">
          No classes configured yet. Return to Step 1 to add classes first.
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => {
            const classSubjects = byClass(cls.id);
            const classHours    = classSubjects.reduce((sum, s) => sum + (s.hoursPerWeek || 0), 0);

            return (
              <div key={cls.id} className="bg-white border border-[#243b4a]/15 rounded-xl overflow-hidden shadow-2xs">
                {/* Class header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#243b4a]/5 border-b border-[#243b4a]/10 flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-black text-[#243b4a]">{cls.label}</span>
                    <span className="text-xs text-[#243b4a]/60 ml-2 font-bold">
                      ({classSubjects.length} subjects · {classHours} hrs/week)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {classes.filter(other => other.id !== cls.id).length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-[#243b4a]">
                        <Copy size={12} className="text-[#243b4a]/50" />
                        <span className="font-bold">Copy:</span>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              copySubjects(val, cls.id);
                              e.target.value = "";
                            }
                          }}
                          className="bg-white border border-[#243b4a]/20 rounded-md text-xs py-1 px-2 font-bold"
                        >
                          <option value="">Select class...</option>
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
                      className="btn-secondary text-xs py-1 px-2.5 font-bold"
                    >
                      <Plus size={13} /> Add Subject
                    </button>
                  </div>
                </div>

                {/* Subject table */}
                {classSubjects.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[#243b4a]/40 text-xs italic font-medium">
                    No subjects added for {cls.label} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#243b4a]/10">
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-[#243b4a]/5 text-[11px] font-extrabold text-[#243b4a]">
                      <div className="col-span-5">Subject Name</div>
                      <div className="col-span-3">Type</div>
                      <div className="col-span-3 text-center">Hrs / Week</div>
                      <div className="col-span-1" />
                    </div>

                    {classSubjects.map(subj => {
                      const isMainDup = isDuplicate(cls.id, subj.name);

                      return (
                        <div key={subj.id} className="grid grid-cols-12 gap-3 items-start px-4 py-2.5 group hover:bg-[#eff2f5]">
                          {/* Subject Inputs Column */}
                          <div className="col-span-5 space-y-1.5">
                            <input
                              type="text"
                              value={subj.name}
                              onChange={e => updateSubject(subj.id, 'name', e.target.value)}
                              placeholder="e.g. Mathematics"
                              className={`input-field text-xs py-1.5 font-bold ${isMainDup ? 'border-rose-300' : ''}`}
                            />

                            {/* Nested Elective Subjects */}
                            {subj.isElective && (
                              <div className="space-y-1 pl-2 border-l-2 border-[#ff732e]">
                                {(subj.electiveSubjects || []).map((elName, elIdx) => (
                                  <div key={elIdx} className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={elName}
                                      onChange={e => {
                                        const updated = [...(subj.electiveSubjects || [])];
                                        updated[elIdx] = e.target.value;
                                        updateSubject(subj.id, 'electiveSubjects', updated);
                                      }}
                                      placeholder={`Elective option ${elIdx + 2}…`}
                                      className="input-field text-xs py-1 flex-1 font-bold"
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = (subj.electiveSubjects || []).filter((_, i) => i !== elIdx);
                                        updateSubject(subj.id, 'electiveSubjects', updated);
                                      }}
                                      className="text-xs text-[#243b4a]/50 hover:text-rose-600 px-1 font-bold"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}

                                <button
                                  onClick={() => {
                                    const updated = [...(subj.electiveSubjects || []), ''];
                                    updateSubject(subj.id, 'electiveSubjects', updated);
                                  }}
                                  className="text-[11px] text-[#ff732e] font-extrabold hover:underline"
                                >
                                  + Add Parallel Elective Option
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Type Column */}
                          <div className="col-span-3 pt-1">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#243b4a] select-none">
                              <input
                                type="checkbox"
                                checked={!!subj.isElective}
                                onChange={e => updateSubject(subj.id, 'isElective', e.target.checked)}
                                className="rounded border-[#243b4a]/30 text-[#ff732e] focus:ring-[#ff732e]/20"
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
                              className="input-field text-xs py-1.5 text-center font-black"
                            />
                          </div>

                          {/* Delete Column */}
                          <div className="col-span-1 flex justify-center pt-1">
                            <button
                              onClick={() => removeSubject(subj.id)}
                              className="btn-danger p-1 opacity-0 group-hover:opacity-100"
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
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-lg text-xs font-bold">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
          Remove duplicate subject names within the same class before continuing.
        </div>
      )}
      {!hasGlobalDuplicates && hasEmptyNames && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg text-xs font-bold">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          Fill in all subject names before continuing.
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
