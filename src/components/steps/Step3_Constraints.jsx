import React, { useState } from 'react';
import {
  Users, BookOpen, ChevronDown, RefreshCw, Sun, Moon,
  Clock, Sparkles, Layers, SlidersHorizontal, Info
} from 'lucide-react';
import { DAYS } from '../../constants';

export default function Step3_Constraints({
  classes = [],
  subjects = [],
  setSubjects,
  teachers = [],
  setTeachers,
  onNext,
  onBack,
  addToast
}) {
  const [activeTab, setActiveTab] = useState('subjects'); // 'staff' | 'subjects'

  // ── Staff Constraints State ────────────────────────────────────────────────
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  // ── Subject Constraints State ──────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const classSubjects = subjects.filter(s => s.classId === selectedClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(classSubjects[0]?.id || '');

  // Keep selectedSubject in sync if class changes
  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || classSubjects[0];
  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classPeriodsCount = activeClass?.periodsPerDay || 6;

  // Joint sync checkbox (defaults to true for seamless collaborative editing)
  const [syncJoint, setSyncJoint] = useState(true);

  // ── Staff Handlers ─────────────────────────────────────────────────────────
  const isTeacherBlocked = (day, period) => {
    return (selectedTeacher?.blockedSlots || []).some(
      s => Number(s.day) === day && Number(s.period) === period
    );
  };

  const toggleTeacherSlot = (day, period) => {
    if (!selectedTeacher) return;
    setTeachers(prev => prev.map(t => {
      if (t.id !== selectedTeacherId) return t;
      const already = (t.blockedSlots || []).some(s => Number(s.day) === day && Number(s.period) === period);
      return {
        ...t,
        blockedSlots: already
          ? t.blockedSlots.filter(s => !(Number(s.day) === day && Number(s.period) === period))
          : [...(t.blockedSlots || []), { day, period }],
      };
    }));
  };

  const clearTeacherBlocks = () => {
    if (!selectedTeacher) return;
    setTeachers(prev => prev.map(t =>
      t.id === selectedTeacherId ? { ...t, blockedSlots: [] } : t
    ));
    addToast?.(`Cleared blocked slots for ${selectedTeacher.name || 'Staff'}.`, 'info');
  };

  const setTeacherPreset = (preset) => {
    if (!selectedTeacher) return;
    let newBlocked = [...(selectedTeacher.blockedSlots || [])];
    const keySet = new Set(newBlocked.map(s => `${s.day}::${s.period}`));

    if (preset === 'morning') {
      DAYS.forEach((_, dIdx) => {
        [0, 1, 2].forEach(pIdx => {
          const k = `${dIdx}::${pIdx}`;
          if (!keySet.has(k)) {
            newBlocked.push({ day: dIdx, period: pIdx });
            keySet.add(k);
          }
        });
      });
    } else if (preset === 'afternoon') {
      DAYS.forEach((_, dIdx) => {
        [3, 4, 5].forEach(pIdx => {
          const k = `${dIdx}::${pIdx}`;
          if (!keySet.has(k)) {
            newBlocked.push({ day: dIdx, period: pIdx });
            keySet.add(k);
          }
        });
      });
    }

    setTeachers(prev => prev.map(t =>
      t.id === selectedTeacherId ? { ...t, blockedSlots: newBlocked } : t
    ));
    addToast?.(`Applied ${preset} preset for ${selectedTeacher.name}.`, 'info');
  };

  // ── Subject Handlers ───────────────────────────────────────────────────────
  const updateActiveSubject = (updates) => {
    if (!activeSubject || !setSubjects) return;

    setSubjects(prev => {
      const isJointTarget = syncJoint && activeSubject.isCombined;
      const jointGroupId = activeSubject.jointGroupId;
      const jointName = activeSubject.name.trim().toLowerCase();

      return prev.map(s => {
        const isSelf = s.id === activeSubject.id;
        const isLinkedJoint = isJointTarget && (
          (jointGroupId && s.jointGroupId === jointGroupId) ||
          (s.name.trim().toLowerCase() === jointName && s.isCombined)
        );

        if (isSelf || isLinkedJoint) {
          return { ...s, ...updates };
        }
        return s;
      });
    });
  };

  const isSubjectBlocked = (day, period) => {
    return (activeSubject?.blockedSlots || []).some(
      s => Number(s.day) === day && Number(s.period) === period
    );
  };

  const toggleSubjectSlot = (day, period) => {
    if (!activeSubject) return;
    const current = activeSubject.blockedSlots || [];
    const already = current.some(s => Number(s.day) === day && Number(s.period) === period);
    const nextBlocked = already
      ? current.filter(s => !(Number(s.day) === day && Number(s.period) === period))
      : [...current, { day, period }];

    updateActiveSubject({ blockedSlots: nextBlocked });
  };

  const clearSubjectBlocks = () => {
    if (!activeSubject) return;
    updateActiveSubject({ blockedSlots: [] });
    addToast?.(`Cleared blocked slots for "${activeSubject.name || 'Subject'}".`, 'info');
  };

  const setSubjectPreset = (preset) => {
    if (!activeSubject) return;
    let nextBlocked = [...(activeSubject.blockedSlots || [])];
    const keySet = new Set(nextBlocked.map(s => `${s.day}::${s.period}`));

    if (preset === 'morning') {
      DAYS.forEach((_, dIdx) => {
        for (let pIdx = 0; pIdx < Math.floor(classPeriodsCount / 2); pIdx++) {
          const k = `${dIdx}::${pIdx}`;
          if (!keySet.has(k)) {
            nextBlocked.push({ day: dIdx, period: pIdx });
            keySet.add(k);
          }
        }
      });
    } else if (preset === 'afternoon') {
      DAYS.forEach((_, dIdx) => {
        for (let pIdx = Math.floor(classPeriodsCount / 2); pIdx < classPeriodsCount; pIdx++) {
          const k = `${dIdx}::${pIdx}`;
          if (!keySet.has(k)) {
            nextBlocked.push({ day: dIdx, period: pIdx });
            keySet.add(k);
          }
        }
      });
    } else if (preset === 'friday_afternoon') {
      const friIdx = DAYS.indexOf('Friday');
      if (friIdx >= 0) {
        for (let pIdx = Math.floor(classPeriodsCount / 2); pIdx < classPeriodsCount; pIdx++) {
          const k = `${friIdx}::${pIdx}`;
          if (!keySet.has(k)) {
            nextBlocked.push({ day: friIdx, period: pIdx });
            keySet.add(k);
          }
        }
      }
    }

    updateActiveSubject({ blockedSlots: nextBlocked });
    addToast?.(`Applied ${preset.replace('_', ' ')} blocks for "${activeSubject.name}".`, 'info');
  };

  // ── Counters for summary badges ────────────────────────────────────────────
  const teachersWithBlocks = teachers.filter(t => (t.blockedSlots || []).length > 0).length;
  const subjectsWithRules = subjects.filter(s =>
    (s.blockedSlots && s.blockedSlots.length > 0) ||
    (s.preferredTime && s.preferredTime !== 'any') ||
    (s.maxPerDay && Number(s.maxPerDay) > 0) ||
    s.consecutivePeriods
  ).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#243b4a]/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Scheduling Constraints</h2>
          <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
            Define timeslot availability, preferred scheduling windows, and workload rules for subjects & staff.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex bg-[#243b4a]/5 p-1 rounded-xl border border-[#243b4a]/15 self-start sm:self-auto shadow-3xs">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'subjects'
                ? 'bg-white text-[#243b4a] shadow-xs'
                : 'text-[#243b4a]/70 hover:text-[#243b4a]'
            }`}
          >
            <BookOpen size={14} className={activeTab === 'subjects' ? 'text-[#ff732e]' : ''} />
            <span>Subject Rules</span>
            {subjectsWithRules > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#ff732e]/10 text-[#ff732e] text-[10px] font-black border border-[#ff732e]/30">
                {subjectsWithRules}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-[#243b4a] shadow-xs'
                : 'text-[#243b4a]/70 hover:text-[#243b4a]'
            }`}
          >
            <Users size={14} className={activeTab === 'staff' ? 'text-[#ff732e]' : ''} />
            <span>Staff Availability</span>
            {teachersWithBlocks > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#243b4a]/10 text-[#243b4a] text-[10px] font-black">
                {teachersWithBlocks}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. SUBJECT CONSTRAINTS TAB                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          {classes.length === 0 || subjects.length === 0 ? (
            <div className="bg-white border border-[#243b4a]/15 rounded-xl p-8 text-center text-xs text-[#243b4a]/60 font-bold shadow-2xs">
              No subjects or classes found. Please set up classes in Step 1 and subjects in Step 2.
            </div>
          ) : (
            <>
              {/* Selectors Bar: Class & Subject */}
              <div className="bg-white border border-[#243b4a]/15 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Class Dropdown */}
                  <div>
                    <label className="block text-xs font-black text-[#243b4a] mb-1 flex items-center gap-1.5">
                      <Layers size={13} className="text-[#ff732e]" />
                      <span>Select Class:</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedClassId}
                        onChange={e => {
                          const newClassId = e.target.value;
                          setSelectedClassId(newClassId);
                          const firstSubj = subjects.find(s => s.classId === newClassId);
                          if (firstSubj) setSelectedSubjectId(firstSubj.id);
                        }}
                        className="select-field text-xs font-bold py-2 pr-7 w-full"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.label} ({c.periodsPerDay} periods/day)
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                    </div>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label className="block text-xs font-black text-[#243b4a] mb-1 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-[#ff732e]" />
                      <span>Select Subject:</span>
                    </label>
                    <div className="relative">
                      <select
                        value={activeSubject?.id || ''}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                        className="select-field text-xs font-bold py-2 pr-7 w-full"
                      >
                        {classSubjects.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name || 'Untitled Subject'} ({s.hoursPerWeek} hrs/wk)
                            {s.isElective ? ' [Elective]' : ''}
                            {s.isCombined ? ' [Joint]' : ''}
                            {(s.blockedSlots || []).length > 0 ? ` · ${s.blockedSlots.length} blocked` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Subject Details & Joint Status Banner */}
                {activeSubject && (
                  <div className="pt-2 border-t border-[#243b4a]/10 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#243b4a]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#243b4a]/60">Subject:</span>
                      <span className="font-black text-[#243b4a]">{activeSubject.name || 'Untitled'}</span>
                      <span className="px-2 py-0.5 rounded bg-[#243b4a]/10 text-[11px] font-black">
                        {activeSubject.hoursPerWeek} hrs/week
                      </span>
                      {activeSubject.isElective && (
                        <span className="px-2 py-0.5 rounded bg-[#ff732e]/10 text-[#ff732e] text-[11px] font-black border border-[#ff732e]/30">
                          Elective Group
                        </span>
                      )}
                      {activeSubject.isCombined && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-black border border-indigo-200">
                          Joint Lecture
                        </span>
                      )}
                    </div>

                    {activeSubject.isCombined && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-indigo-900 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-200">
                        <input
                          type="checkbox"
                          checked={syncJoint}
                          onChange={e => setSyncJoint(e.target.checked)}
                          className="accent-indigo-600 rounded"
                        />
                        <span>Sync rules with linked joint classes</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Subject Rule Modifiers Card */}
              {activeSubject && (
                <div className="bg-white border border-[#243b4a]/15 rounded-xl p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#243b4a]/10 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-[#ff732e]" />
                      <h3 className="text-xs font-black text-[#243b4a] uppercase tracking-wider">
                        Subject Scheduling Rules
                      </h3>
                    </div>
                    <div className="text-[11px] text-[#243b4a]/60 font-bold flex items-center gap-1">
                      <Info size={12} className="text-[#243b4a]/40" />
                      <span>Constraints are strictly enforced by the CSP scheduler</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Preferred Time Window */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#243b4a] block">
                        Preferred Time of Day:
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-[#243b4a]/5 p-1 rounded-lg border border-[#243b4a]/10">
                        <button
                          type="button"
                          onClick={() => updateActiveSubject({ preferredTime: 'any' })}
                          className={`py-1.5 px-2 rounded-md text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                            !activeSubject.preferredTime || activeSubject.preferredTime === 'any'
                              ? 'bg-white text-[#243b4a] shadow-xs'
                              : 'text-[#243b4a]/60 hover:text-[#243b4a]'
                          }`}
                        >
                          <Clock size={12} />
                          <span>Any Time</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveSubject({ preferredTime: 'morning' })}
                          className={`py-1.5 px-2 rounded-md text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                            activeSubject.preferredTime === 'morning'
                              ? 'bg-[#ff732e] text-white shadow-xs'
                              : 'text-[#243b4a]/60 hover:text-[#243b4a]'
                          }`}
                        >
                          <Sun size={12} />
                          <span>Morning</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveSubject({ preferredTime: 'afternoon' })}
                          className={`py-1.5 px-2 rounded-md text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                            activeSubject.preferredTime === 'afternoon'
                              ? 'bg-[#243b4a] text-white shadow-xs'
                              : 'text-[#243b4a]/60 hover:text-[#243b4a]'
                          }`}
                        >
                          <Moon size={12} />
                          <span>Afternoon</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-[#243b4a]/50 font-bold">
                        Morning: P1–P{Math.floor(classPeriodsCount / 2)} · Afternoon: P{Math.floor(classPeriodsCount / 2) + 1}–P{classPeriodsCount}
                      </p>
                    </div>

                    {/* 2. Max Periods Per Day */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#243b4a] block">
                        Maximum Periods Per Day:
                      </label>
                      <div className="relative">
                        <select
                          value={activeSubject.maxPerDay || 0}
                          onChange={e => updateActiveSubject({ maxPerDay: Number(e.target.value) })}
                          className="select-field text-xs font-bold py-2 pr-7 w-full"
                        >
                          <option value={0}>Balanced (Solver Default)</option>
                          <option value={1}>Max 1 period / day</option>
                          <option value={2}>Max 2 periods / day</option>
                          <option value={3}>Max 3 periods / day</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-[#243b4a]/50 font-bold">
                        Prevents clustering too many hours of this subject in a single day.
                      </p>
                    </div>

                    {/* 3. Consecutive Block (Labs/Practicals) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#243b4a] block">
                        Continuous Session:
                      </label>
                      <button
                        type="button"
                        onClick={() => updateActiveSubject({ consecutivePeriods: !activeSubject.consecutivePeriods })}
                        className={`w-full py-2 px-3 rounded-lg border text-xs font-black transition-all flex items-center justify-between ${
                          activeSubject.consecutivePeriods
                            ? 'bg-[#243b4a] border-[#243b4a] text-white shadow-xs'
                            : 'bg-white border-[#243b4a]/20 text-[#243b4a] hover:bg-[#eff2f5]'
                        }`}
                      >
                        <span>Consecutive Double Hour</span>
                        {activeSubject.consecutivePeriods ? (
                          <span className="w-2 h-2 rounded-full bg-[#ff732e]" />
                        ) : (
                          <span className="text-[10px] text-[#243b4a]/40">Off</span>
                        )}
                      </button>
                      <p className="text-[10px] text-[#243b4a]/50 font-bold">
                        Ideal for Labs, Workshops, or 2-hour practical sessions.
                      </p>
                    </div>
                  </div>

                  {/* ── Blocked Timeslots Matrix ── */}
                  <div className="pt-3 border-t border-[#243b4a]/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-[#243b4a] flex items-center gap-1.5">
                          <span>Unavailable Timeslots for "{activeSubject.name || 'Subject'}"</span>
                          <span className="text-[11px] font-bold text-[#243b4a]/50">
                            ({(activeSubject.blockedSlots || []).length} blocked)
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#243b4a]/60 font-bold">
                          Click any cell in the grid to forbid this subject from being scheduled at that period.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSubjectPreset('friday_afternoon')}
                          className="btn-secondary text-[11px] py-1 px-2 font-bold"
                          title="Block Friday afternoon periods"
                        >
                          Block Fri PM
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectPreset('morning')}
                          className="btn-secondary text-[11px] py-1 px-2 font-bold"
                          title="Block all morning periods"
                        >
                          Block All AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectPreset('afternoon')}
                          className="btn-secondary text-[11px] py-1 px-2 font-bold"
                          title="Block all afternoon periods"
                        >
                          Block All PM
                        </button>
                        {(activeSubject.blockedSlots || []).length > 0 && (
                          <button
                            type="button"
                            onClick={clearSubjectBlocks}
                            className="btn-secondary text-[11px] py-1 px-2 font-bold flex items-center gap-1 text-rose-700 hover:text-rose-800"
                          >
                            <RefreshCw size={11} />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Matrix Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-separate" style={{ borderSpacing: '4px' }}>
                        <thead>
                          <tr>
                            <th className="text-[#243b4a]/50 font-bold text-center px-2 py-1.5 w-14 text-[10px]">
                              Period
                            </th>
                            {DAYS.map(day => (
                              <th
                                key={day}
                                className="text-[#243b4a] font-black text-center px-3 py-1.5 bg-[#243b4a]/5 border border-[#243b4a]/10 rounded-lg text-[11px]"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: classPeriodsCount }, (_, pIdx) => (
                            <tr key={pIdx}>
                              <td className="text-[#243b4a] font-black text-xs pr-2 text-center bg-[#243b4a]/5 rounded-lg border border-[#243b4a]/10">
                                P{pIdx + 1}
                              </td>
                              {DAYS.map((_, dIdx) => {
                                const blocked = isSubjectBlocked(dIdx, pIdx);
                                return (
                                  <td key={dIdx} className="text-center p-0">
                                    <button
                                      type="button"
                                      id={`subj-slot-${dIdx}-${pIdx}`}
                                      onClick={() => toggleSubjectSlot(dIdx, pIdx)}
                                      className={`
                                        w-full h-9 rounded-lg border transition-all text-xs font-bold flex items-center justify-center
                                        ${blocked
                                          ? 'bg-[#ff732e] border-[#ff732e] text-white shadow-2xs'
                                          : 'bg-white border-[#243b4a]/20 text-[#243b4a] hover:bg-[#eff2f5]'
                                        }
                                      `}
                                    >
                                      {blocked ? 'Blocked' : 'Free'}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Configured Subjects Overview Pill Bar */}
              {subjectsWithRules > 0 && (
                <div className="bg-[#243b4a]/5 border border-[#243b4a]/15 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#243b4a]">
                    <Sparkles size={13} className="text-[#ff732e]" />
                    <span>Active Subject Rules in Department ({subjectsWithRules}):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects
                      .filter(s =>
                        (s.blockedSlots && s.blockedSlots.length > 0) ||
                        (s.preferredTime && s.preferredTime !== 'any') ||
                        (s.maxPerDay && Number(s.maxPerDay) > 0) ||
                        s.consecutivePeriods
                      )
                      .map(s => {
                        const clsObj = classes.find(c => c.id === s.classId);
                        const isCurrent = s.id === activeSubject?.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedClassId(s.classId);
                              setSelectedSubjectId(s.id);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all flex items-center gap-1.5 ${
                              isCurrent
                                ? 'bg-[#243b4a] text-white border-[#243b4a]'
                                : 'bg-white text-[#243b4a] border-[#243b4a]/20 hover:border-[#ff732e]'
                            }`}
                          >
                            <span>{s.name || 'Subject'}</span>
                            <span className="text-[10px] opacity-70 font-bold">({clsObj?.label || s.classId})</span>
                            {s.blockedSlots?.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-[#ff732e] text-white text-[9px] font-black">
                                {s.blockedSlots.length} blk
                              </span>
                            )}
                            {s.preferredTime && s.preferredTime !== 'any' && (
                              <span className="px-1 py-0.2 rounded bg-white/20 text-[9px] font-bold uppercase">
                                {s.preferredTime}
                              </span>
                            )}
                          </button>
                        );
                      })
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. STAFF CONSTRAINTS TAB                                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {teachers.length === 0 ? (
            <div className="bg-white border border-[#243b4a]/15 rounded-xl p-8 text-center text-xs text-[#243b4a]/60 font-bold shadow-2xs">
              No teachers added yet. Return to Step 3 to add staff members first.
            </div>
          ) : (
            <div className="bg-white border border-[#243b4a]/15 rounded-xl p-5 space-y-4 shadow-2xs">
              {/* Staff Selector & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#243b4a]/10">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-black text-[#243b4a] flex items-center gap-1.5">
                    <Users size={14} className="text-[#ff732e]" />
                    <span>Select Staff:</span>
                  </label>
                  <div className="relative min-w-[200px]">
                    <select
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      className="select-field text-xs font-bold py-1.5 pr-7"
                    >
                      {teachers.map((t, idx) => (
                        <option key={t.id} value={t.id}>
                          {t.name || `Teacher ${idx + 1}`}
                          {(t.blockedSlots || []).length > 0 ? ` (${t.blockedSlots.length} blocked)` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTeacherPreset('morning')}
                    className="btn-secondary text-xs py-1 px-2.5 font-bold"
                  >
                    Block AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherPreset('afternoon')}
                    className="btn-secondary text-xs py-1 px-2.5 font-bold"
                  >
                    Block PM
                  </button>
                  {selectedTeacher && (
                    <button
                      type="button"
                      onClick={clearTeacherBlocks}
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-bold text-rose-700 hover:text-rose-800"
                    >
                      <RefreshCw size={12} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Legend */}
              <div className="flex items-center gap-4 text-xs text-[#243b4a] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-white border border-[#243b4a]/20"></div>
                  <span>Available / Free</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#ff732e] border border-[#ff732e]"></div>
                  <span>Blocked / Unavailable</span>
                </div>
              </div>

              {/* Constraint Matrix Grid */}
              {selectedTeacher && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate" style={{ borderSpacing: '4px' }}>
                    <thead>
                      <tr>
                        <th className="text-[#243b4a]/50 font-bold text-center px-2 py-1.5 w-14">Period</th>
                        {DAYS.map(day => (
                          <th
                            key={day}
                            className="text-[#243b4a] font-black text-center px-3 py-2 bg-[#243b4a]/5 border border-[#243b4a]/10 rounded-lg text-xs"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4, 5].map((pIdx) => (
                        <tr key={pIdx}>
                          <td className="text-[#243b4a] font-black text-xs pr-2 text-center bg-[#243b4a]/5 rounded-lg border border-[#243b4a]/10">
                            P{pIdx + 1}
                          </td>
                          {DAYS.map((_, dIdx) => {
                            const blocked = isTeacherBlocked(dIdx, pIdx);
                            return (
                              <td key={dIdx} className="text-center p-0">
                                <button
                                  type="button"
                                  onClick={() => toggleTeacherSlot(dIdx, pIdx)}
                                  className={`
                                    w-full h-10 rounded-lg border transition-all text-xs font-bold flex items-center justify-center
                                    ${blocked
                                      ? 'bg-[#ff732e] border-[#ff732e] text-white shadow-2xs'
                                      : 'bg-white border-[#243b4a]/20 text-[#243b4a] hover:bg-[#eff2f5]'
                                    }
                                  `}
                                >
                                  {blocked ? 'Blocked' : 'Free'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button type="button" onClick={onNext} className="btn-primary">
          Continue to Generate →
        </button>
      </div>
    </div>
  );
}
