import React from 'react';
import { Plus, Trash2, AlertCircle, Copy, Users2 } from 'lucide-react';

function generateId() {
  return `subj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateJointId() {
  return `jg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptySubject(classId) {
  return {
    id: generateId(),
    classId,
    name: '',
    hoursPerWeek: 3,
    isElective: false,
    electiveSubjects: [],
    isCombined: false,
    combinedWithClasses: [],
    jointGroupId: null,
  };
}

export default function Step2_Subjects({ classes, subjects, setSubjects, onNext, onBack }) {
  const byClass = (classId) => subjects.filter(s => s.classId === classId);

  const addSubject = (classId) => {
    setSubjects(prev => [...prev, emptySubject(classId)]);
  };

  const removeSubject = (id) => {
    setSubjects(prev => {
      const target = prev.find(s => s.id === id);
      if (!target) return prev.filter(s => s.id !== id);

      const remaining = prev.filter(s => s.id !== id);
      if (target.isCombined && target.jointGroupId) {
        return remaining.map(s => {
          if (s.jointGroupId === target.jointGroupId) {
            const nextCombined = (s.combinedWithClasses || []).filter(cId => cId !== target.classId);
            return {
              ...s,
              combinedWithClasses: nextCombined,
              isCombined: nextCombined.length > 0,
              jointGroupId: nextCombined.length > 0 ? s.jointGroupId : null,
            };
          }
          return s;
        });
      }
      return remaining;
    });
  };

  const updateSubject = (id, field, value) => {
    setSubjects(prev => {
      const target = prev.find(s => s.id === id);
      if (!target) return prev;

      const updatedTarget = {
        ...target,
        [field]: field === 'hoursPerWeek'
          ? Math.max(1, Number(value))
          : field === 'isElective' || field === 'isCombined'
          ? Boolean(value)
          : value
      };

      if (field === 'isElective') {
        if (value) {
          updatedTarget.electiveSubjects = updatedTarget.electiveSubjects && updatedTarget.electiveSubjects.length > 0
            ? updatedTarget.electiveSubjects
            : [''];
        } else {
          updatedTarget.electiveSubjects = [];
        }
      }

      if (field === 'isCombined') {
        if (value) {
          if (!updatedTarget.jointGroupId) {
            updatedTarget.jointGroupId = generateJointId();
          }
          const otherClasses = classes.filter(c => c.id !== target.classId);
          if ((!updatedTarget.combinedWithClasses || updatedTarget.combinedWithClasses.length === 0) && otherClasses.length > 0) {
            updatedTarget.combinedWithClasses = [otherClasses[0].id];
          }
        } else {
          updatedTarget.combinedWithClasses = [];
          updatedTarget.jointGroupId = null;
        }
      }

      // If subject is combined and has linked classes, ensure all target classes have the linked subject synced
      if (updatedTarget.isCombined && (updatedTarget.combinedWithClasses || []).length > 0) {
        const jgId = updatedTarget.jointGroupId || generateJointId();
        updatedTarget.jointGroupId = jgId;

        const targetClassIds = updatedTarget.combinedWithClasses || [];
        let nextList = prev.map(s => s.id === id ? updatedTarget : s);

        targetClassIds.forEach(targetClassId => {
          const targetOtherClass = classes.find(c => c.id === targetClassId);
          if (!targetOtherClass) return;

          const existingByJg = nextList.find(s => s.classId === targetClassId && s.jointGroupId === jgId);
          if (existingByJg) {
            nextList = nextList.map(s => {
              if (s.id === existingByJg.id) {
                return {
                  ...s,
                  name: updatedTarget.name,
                  hoursPerWeek: updatedTarget.hoursPerWeek,
                  isElective: !!updatedTarget.isElective,
                  electiveSubjects: Array.isArray(updatedTarget.electiveSubjects) ? [...updatedTarget.electiveSubjects] : [],
                  isCombined: true,
                  jointGroupId: jgId,
                  combinedWithClasses: Array.from(new Set([...(s.combinedWithClasses || []), target.classId])),
                };
              }
              return s;
            });
            return;
          }

          const trimmedName = (updatedTarget.name || '').trim().toLowerCase();
          const existingByName = trimmedName
            ? nextList.find(s => s.classId === targetClassId && s.name.trim().toLowerCase() === trimmedName)
            : null;

          if (existingByName) {
            nextList = nextList.map(s => {
              if (s.id === existingByName.id) {
                return {
                  ...s,
                  name: updatedTarget.name,
                  hoursPerWeek: updatedTarget.hoursPerWeek,
                  isElective: !!updatedTarget.isElective,
                  electiveSubjects: Array.isArray(updatedTarget.electiveSubjects) ? [...updatedTarget.electiveSubjects] : [],
                  isCombined: true,
                  jointGroupId: jgId,
                  combinedWithClasses: Array.from(new Set([...(s.combinedWithClasses || []), target.classId])),
                };
              }
              return s;
            });
            return;
          }

          // Otherwise, auto-create the linked subject in target class!
          const newLinkedSubj = {
            id: generateId(),
            classId: targetClassId,
            name: updatedTarget.name,
            hoursPerWeek: updatedTarget.hoursPerWeek,
            isElective: !!updatedTarget.isElective,
            electiveSubjects: Array.isArray(updatedTarget.electiveSubjects) ? [...updatedTarget.electiveSubjects] : [],
            isCombined: true,
            combinedWithClasses: [target.classId],
            jointGroupId: jgId,
          };
          nextList.push(newLinkedSubj);
        });

        return nextList;
      }

      // If isCombined was turned off, unlink in other classes that shared the jointGroupId
      if (target.isCombined && !updatedTarget.isCombined && target.jointGroupId) {
        return prev.map(s => {
          if (s.id === id) return updatedTarget;
          if (s.jointGroupId === target.jointGroupId) {
            const nextCombined = (s.combinedWithClasses || []).filter(cId => cId !== target.classId);
            return {
              ...s,
              combinedWithClasses: nextCombined,
              isCombined: nextCombined.length > 0,
              jointGroupId: nextCombined.length > 0 ? s.jointGroupId : null,
            };
          }
          return s;
        });
      }

      return prev.map(s => s.id === id ? updatedTarget : s);
    });
  };

  const toggleCombinedClass = (subjectId, otherClassId) => {
    setSubjects(prev => {
      const subject = prev.find(s => s.id === subjectId);
      if (!subject) return prev;

      const current = subject.combinedWithClasses || [];
      const isCurrentlySelected = current.includes(otherClassId);
      const updatedCombined = isCurrentlySelected
        ? current.filter(id => id !== otherClassId)
        : [...current, otherClassId];

      const jgId = subject.jointGroupId || generateJointId();

      const updatedOrigin = {
        ...subject,
        isCombined: updatedCombined.length > 0,
        combinedWithClasses: updatedCombined,
        jointGroupId: updatedCombined.length > 0 ? jgId : null,
      };

      let nextSubjects = prev.map(s => s.id === subjectId ? updatedOrigin : s);

      if (!isCurrentlySelected) {
        // LINKING otherClassId:
        const targetOtherClass = classes.find(c => c.id === otherClassId);
        if (targetOtherClass) {
          const existingByJg = nextSubjects.find(s => s.classId === otherClassId && s.jointGroupId === jgId);
          if (existingByJg) {
            nextSubjects = nextSubjects.map(s => s.id === existingByJg.id ? {
              ...s,
              name: subject.name,
              hoursPerWeek: subject.hoursPerWeek,
              isElective: !!subject.isElective,
              electiveSubjects: Array.isArray(subject.electiveSubjects) ? [...subject.electiveSubjects] : [],
              isCombined: true,
              jointGroupId: jgId,
              combinedWithClasses: Array.from(new Set([...(s.combinedWithClasses || []), subject.classId])),
            } : s);
          } else {
            const trimmedName = (subject.name || '').trim().toLowerCase();
            const existingByName = trimmedName
              ? nextSubjects.find(s => s.classId === otherClassId && s.name.trim().toLowerCase() === trimmedName)
              : null;

            if (existingByName) {
              nextSubjects = nextSubjects.map(s => s.id === existingByName.id ? {
                ...s,
                name: subject.name,
                hoursPerWeek: subject.hoursPerWeek,
                isElective: !!subject.isElective,
                electiveSubjects: Array.isArray(subject.electiveSubjects) ? [...subject.electiveSubjects] : [],
                isCombined: true,
                jointGroupId: jgId,
                combinedWithClasses: Array.from(new Set([...(s.combinedWithClasses || []), subject.classId])),
              } : s);
            } else {
              const linkedSubj = {
                id: generateId(),
                classId: otherClassId,
                name: subject.name,
                hoursPerWeek: subject.hoursPerWeek,
                isElective: !!subject.isElective,
                electiveSubjects: Array.isArray(subject.electiveSubjects) ? [...subject.electiveSubjects] : [],
                isCombined: true,
                combinedWithClasses: [subject.classId],
                jointGroupId: jgId,
              };
              nextSubjects.push(linkedSubj);
            }
          }
        }
      } else {
        // UNLINKING otherClassId:
        nextSubjects = nextSubjects.map(s => {
          if (s.classId === otherClassId && (s.jointGroupId === jgId || (s.combinedWithClasses || []).includes(subject.classId))) {
            const nextCombined = (s.combinedWithClasses || []).filter(cId => cId !== subject.classId);
            return {
              ...s,
              combinedWithClasses: nextCombined,
              isCombined: nextCombined.length > 0,
              jointGroupId: nextCombined.length > 0 ? s.jointGroupId : null,
            };
          }
          return s;
        });
      }

      return nextSubjects;
    });
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
      isCombined: s.isCombined || false,
      combinedWithClasses: s.combinedWithClasses ? [...s.combinedWithClasses] : [],
      jointGroupId: s.jointGroupId || null,
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
          Define weekly subject hours per class. Mark <b>Joint / Combined</b> if Class A & B share the same room & teacher.
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
                      <div className="col-span-4">Type & Structure</div>
                      <div className="col-span-2 text-center">Hrs / Wk</div>
                      <div className="col-span-1" />
                    </div>

                    {classSubjects.map(subj => {
                      const isMainDup = isDuplicate(cls.id, subj.name);
                      const otherClasses = classes.filter(c => c.id !== cls.id);

                      return (
                        <div key={subj.id} className="grid grid-cols-12 gap-3 items-start px-4 py-3 group hover:bg-[#eff2f5]/60 transition-colors">
                          {/* Subject Inputs Column */}
                          <div className="col-span-5 space-y-1.5">
                            {subj.isElective && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ff732e] text-white">
                                  Option 1 (Primary Elective)
                                </span>
                                {subj.isCombined && (subj.combinedWithClasses || []).length > 0 && (
                                  <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Users2 size={10} /> Joint
                                  </span>
                                )}
                              </div>
                            )}

                            <input
                              type="text"
                              value={subj.name}
                              onChange={e => updateSubject(subj.id, 'name', e.target.value)}
                              placeholder={subj.isElective ? "Elective Option 1 (e.g. Cloud Computing)" : "e.g. Mathematics"}
                              className={`input-field text-xs py-1.5 font-bold ${isMainDup ? 'border-rose-300' : ''}`}
                            />

                            {/* Combined Class Indicator pill */}
                            {subj.isCombined && (subj.combinedWithClasses || []).length > 0 && (
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                                <Users2 size={12} className="text-indigo-600 flex-shrink-0" />
                                <span>Joint with: {
                                  (subj.combinedWithClasses || [])
                                    .map(cId => classes.find(c => c.id === cId)?.label || cId)
                                    .join(', ')
                                }</span>
                              </div>
                            )}

                            {/* Nested Elective Subjects */}
                            {subj.isElective && (
                              <div className="space-y-2 pl-2 border-l-2 border-[#ff732e] mt-1.5">
                                {(subj.electiveSubjects || []).map((elName, elIdx) => (
                                  <div key={elIdx} className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-[#ff732e]">
                                      <span className="px-1.5 py-0.2 rounded bg-[#ff732e]/10 border border-[#ff732e]/20">
                                        Option {elIdx + 2} (Parallel Elective)
                                      </span>
                                      {subj.isCombined && (subj.combinedWithClasses || []).length > 0 && (
                                        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                          <Users2 size={9} /> Joint
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={elName}
                                        onChange={e => {
                                          const updated = [...(subj.electiveSubjects || [])];
                                          updated[elIdx] = e.target.value;
                                          updateSubject(subj.id, 'electiveSubjects', updated);
                                        }}
                                        placeholder={`Elective Option ${elIdx + 2} (e.g. Predictive Analytics)…`}
                                        className="input-field text-xs py-1 flex-1 font-bold"
                                      />
                                      <button
                                        onClick={() => {
                                          const updated = (subj.electiveSubjects || []).filter((_, i) => i !== elIdx);
                                          updateSubject(subj.id, 'electiveSubjects', updated);
                                        }}
                                        className="text-xs text-[#243b4a]/50 hover:text-rose-600 px-1 font-bold"
                                        title="Remove this elective option"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  onClick={() => {
                                    const updated = [...(subj.electiveSubjects || []), ''];
                                    updateSubject(subj.id, 'electiveSubjects', updated);
                                  }}
                                  className="text-[11px] text-[#ff732e] font-extrabold hover:underline block pt-0.5"
                                >
                                  + Add Parallel Elective Option
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Type Column (Elective vs Joint Combined) */}
                          <div className="col-span-4 space-y-1.5 pt-0.5">
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#243b4a] select-none">
                                <input
                                  type="checkbox"
                                  checked={!!subj.isElective}
                                  onChange={e => updateSubject(subj.id, 'isElective', e.target.checked)}
                                  className="rounded border-[#243b4a]/30 text-[#ff732e] focus:ring-[#ff732e]/20"
                                />
                                <span>Elective</span>
                              </label>

                              {otherClasses.length > 0 && (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-800 select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!subj.isCombined}
                                    onChange={e => updateSubject(subj.id, 'isCombined', e.target.checked)}
                                    className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500/20"
                                  />
                                  <span>Joint / Combined</span>
                                </label>
                              )}
                            </div>

                            {/* Combined Class Selector */}
                            {subj.isCombined && otherClasses.length > 0 && (
                              <div className="p-2 bg-indigo-50/70 border border-indigo-200/60 rounded-lg space-y-1">
                                <span className="text-[10px] font-black text-indigo-900 block uppercase tracking-wider">
                                  Combine with section:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {otherClasses.map(other => {
                                    const isSelected = (subj.combinedWithClasses || []).includes(other.id);
                                    return (
                                      <button
                                        type="button"
                                        key={other.id}
                                        onClick={() => toggleCombinedClass(subj.id, other.id)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                            : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                                        }`}
                                      >
                                        {isSelected ? `✓ ${other.label}` : `+ ${other.label}`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hours Column */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={subj.hoursPerWeek}
                              onChange={e => updateSubject(subj.id, 'hoursPerWeek', e.target.value)}
                              className="input-field text-xs py-1.5 text-center font-black"
                            />
                            {(subj.theoryHours > 0 || subj.labHours > 0) && (
                              <div className="text-[10px] text-center font-bold text-[#243b4a]/70 mt-1 bg-[#eff2f5] px-1.5 py-0.5 rounded border border-[#243b4a]/10">
                                Theory: {subj.theoryHours}h · Lab: {subj.labHours}h
                              </div>
                            )}
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
