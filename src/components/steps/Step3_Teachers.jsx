import React, { useState } from 'react';
import {
  Trash2, UserPlus, Users2, AlertCircle, Clock,
  CheckCircle2, Sparkles, BookOpen, Layers
} from 'lucide-react';
import { TEACHER_COLORS, SUBJECT_COMPONENTS } from '../../constants';
import {
  getSubjectAllocations,
  saveSubjectAllocations,
  calculateSubjectAllocations,
  getResolvedSubject,
} from '../../utils/allocationUtils';

let teacherIdCounter = 1;

function newTeacher(name = '') {
  return {
    id: `t${Date.now()}_${teacherIdCounter++}`,
    name,
    subjects: [],
    blockedSlots: [],
  };
}

const DEFAULT_STAFF_PRESETS = [
  'Dr. Alan Turing',
  'Prof. Grace Hopper',
  'Dr. John von Neumann',
  'Dr. Ada Lovelace',
  'Prof. Claude Shannon',
  'Dr. Donald Knuth',
  'Dr. Barbara Liskov',
  'Prof. Tim Berners-Lee',
];

/**
 * Expand a class's subjects into individual allocatable units.
 * If a subject is an Elective with parallel options (e.g. cloud computing + predictive analytics),
 * each elective option is returned as its own allocatable unit.
 */
function getSubjectAllocationUnits(classSubjects) {
  const units = [];

  classSubjects.forEach(s => {
    if (s.isElective && Array.isArray(s.electiveSubjects) && s.electiveSubjects.length > 0) {
      // 1. Primary elective option (Option 1)
      units.push({
        baseSubject: s,
        allocId: `${s.id}::primary`,
        name: s.name || 'Elective Option 1',
        isElective: true,
        isCombined: !!s.isCombined,
        combinedWithClasses: s.combinedWithClasses || [],
        hoursPerWeek: Number(s.hoursPerWeek) || 3,
        isElectiveOption: true,
        optionIndex: 0,
        groupTitle: s.name,
      });

      // 2. Parallel elective options (Option 2, Option 3, etc.)
      s.electiveSubjects.forEach((elName, elIdx) => {
        units.push({
          baseSubject: s,
          allocId: `${s.id}::elective::${elIdx}`,
          name: elName || `Elective Option ${elIdx + 2}`,
          isElective: true,
          isCombined: !!s.isCombined,
          combinedWithClasses: s.combinedWithClasses || [],
          hoursPerWeek: Number(s.hoursPerWeek) || 3,
          isElectiveOption: true,
          optionIndex: elIdx + 1,
          groupTitle: s.name,
        });
      });
    } else {
      // Standard subject or single elective
      units.push({
        baseSubject: s,
        allocId: s.id,
        name: s.name || 'Unnamed Subject',
        isElective: !!s.isElective,
        isCombined: !!s.isCombined,
        combinedWithClasses: s.combinedWithClasses || [],
        hoursPerWeek: Number(s.hoursPerWeek) || 3,
        isElectiveOption: false,
      });
    }
  });

  return units;
}

export default function Step3_Teachers({
  classes, subjects, teachers, setTeachers, onNext, onBack
}) {
  const [viewMode, setViewMode] = useState('subject'); // 'subject' or 'teacher'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [newStaffName, setNewStaffName] = useState('');

  // ── Live Allocation Calculation ───────────────────────────────────────────
  const { errors } = calculateSubjectAllocations(classes, subjects, teachers);

  // ── Teacher CRUD ──────────────────────────────────────────────────────────
  const handleAddTeacher = (name = '') => {
    const trimmed = (name || newStaffName).trim();
    if (!trimmed) return;
    const t = newTeacher(trimmed);
    setTeachers(prev => [...prev, t]);
    setNewStaffName('');
  };

  const handleLoadStaffPresets = () => {
    const existing = new Set(teachers.map(t => t.name.toLowerCase()));
    const toAdd = DEFAULT_STAFF_PRESETS
      .filter(name => !existing.has(name.toLowerCase()))
      .map(name => newTeacher(name));

    if (toAdd.length > 0) {
      setTeachers(prev => [...prev, ...toAdd]);
    }
  };

  const removeTeacher = (id) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
  };

  const updateTeacherName = (id, name) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  };

  // ── Subject-First Split Helpers ───────────────────────────────────────────
  const handleAddCoTeacher = (item, classId) => {
    if (teachers.length === 0) {
      alert("Please add at least one faculty member first!");
      return;
    }

    const allocId = item.allocId || item.id;
    const currentAllocations = getSubjectAllocations(allocId, classId, teachers, subjects);
    const assignedIds = new Set(currentAllocations.map(a => a.teacherId));
    const availableTeacher = teachers.find(t => !assignedIds.has(t.id)) || teachers[0];

    const allocatedSum = currentAllocations.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
    const remaining = Math.max(1, item.hoursPerWeek - allocatedSum);

    const defaultComponent = currentAllocations.length === 0
      ? 'Theory'
      : currentAllocations.length === 1
      ? 'Lab'
      : 'Tutorial';

    const updated = [
      ...currentAllocations,
      {
        teacherId: availableTeacher.id,
        teacherName: availableTeacher.name,
        hours: remaining,
        component: defaultComponent,
      }
    ];

    saveSubjectAllocations(
      allocId,
      classId,
      updated,
      teachers,
      setTeachers,
      item.isCombined ? item.combinedWithClasses : [],
      subjects
    );
  };

  const handleUpdateAllocation = (item, classId, allocIndex, field, value) => {
    const allocId = item.allocId || item.id;
    const currentAllocations = getSubjectAllocations(allocId, classId, teachers, subjects);
    const updated = currentAllocations.map((alloc, idx) => {
      if (idx !== allocIndex) return alloc;
      if (field === 'teacherId') {
        const found = teachers.find(t => t.id === value);
        return {
          ...alloc,
          teacherId: value,
          teacherName: found ? found.name : alloc.teacherName,
        };
      }
      return {
        ...alloc,
        [field]: field === 'hours' ? Math.max(0, Number(value)) : value,
      };
    });

    saveSubjectAllocations(
      allocId,
      classId,
      updated,
      teachers,
      setTeachers,
      item.isCombined ? item.combinedWithClasses : [],
      subjects
    );
  };

  const handleRemoveAllocation = (item, classId, allocIndex) => {
    const allocId = item.allocId || item.id;
    const currentAllocations = getSubjectAllocations(allocId, classId, teachers, subjects);
    const updated = currentAllocations.filter((_, idx) => idx !== allocIndex);

    saveSubjectAllocations(
      allocId,
      classId,
      updated,
      teachers,
      setTeachers,
      item.isCombined ? item.combinedWithClasses : [],
      subjects
    );
  };

  const handleSplitEvenly = (item, classId) => {
    const allocId = item.allocId || item.id;
    const currentAllocations = getSubjectAllocations(allocId, classId, teachers, subjects);
    if (currentAllocations.length === 0) return;

    const totalHours = item.hoursPerWeek;
    const count = currentAllocations.length;
    const baseShare = Math.floor(totalHours / count);
    const remainder = totalHours % count;

    const updated = currentAllocations.map((alloc, idx) => ({
      ...alloc,
      hours: baseShare + (idx < remainder ? 1 : 0),
    }));

    saveSubjectAllocations(
      allocId,
      classId,
      updated,
      teachers,
      setTeachers,
      item.isCombined ? item.combinedWithClasses : [],
      subjects
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const teacherNameCounts = {};
  teachers.forEach(t => {
    const key = t.name.trim().toLowerCase();
    if (key) teacherNameCounts[key] = (teacherNameCounts[key] || 0) + 1;
  });
  const hasDupTeacherNames = Object.values(teacherNameCounts).some(v => v > 1);
  const hasEmptyTeacherNames = teachers.some(t => !t.name.trim());

  const canProceed = (
    teachers.length > 0 &&
    !hasEmptyTeacherNames &&
    !hasDupTeacherNames &&
    errors.length === 0
  );

  const filteredClasses = selectedClassFilter === 'all'
    ? classes
    : classes.filter(c => c.id === selectedClassFilter);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243b4a]/10 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Teaching Staff & Faculty Allocation</h2>
          <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
            Divide subjects across teachers with Theory & Lab components. Electives and joint lectures sync automatically.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 bg-[#eff2f5] p-1 rounded-xl border border-[#243b4a]/15 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('subject')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'subject'
                ? 'bg-[#243b4a] text-white shadow-xs'
                : 'text-[#243b4a] hover:bg-white'
            }`}
          >
            <BookOpen size={13} />
            Split by Subject (Recommended)
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'teacher'
                ? 'bg-[#243b4a] text-white shadow-xs'
                : 'text-[#243b4a] hover:bg-white'
            }`}
          >
            <UserPlus size={13} />
            Faculty Staff List ({teachers.length})
          </button>
        </div>
      </div>

      {/* Quick Add Staff Bar */}
      <div className="bg-white border border-[#243b4a]/15 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <UserPlus size={16} className="text-[#ff732e] flex-shrink-0" />
          <input
            type="text"
            value={newStaffName}
            onChange={e => setNewStaffName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTeacher(); }}
            placeholder="Enter new faculty name (e.g. Dr. Alan Turing)..."
            className="input-field text-xs py-1.5 flex-1 font-bold"
          />
          <button
            onClick={() => handleAddTeacher()}
            disabled={!newStaffName.trim()}
            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
          >
            + Add Staff
          </button>
        </div>

        {teachers.length === 0 && (
          <button
            onClick={handleLoadStaffPresets}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-[#ff732e] w-full sm:w-auto justify-center"
          >
            <Sparkles size={13} /> Load 8 Default Faculty
          </button>
        )}
      </div>

      {/* Validation Error Banner */}
      {errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl space-y-1 text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-1.5 font-black text-rose-900">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>Allocation Quota Warnings</span>
          </div>
          {errors.map((err, idx) => (
            <p key={idx} className="pl-5 text-rose-700 font-semibold">• {err.message}</p>
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 1: SUBJECT-FIRST ALLOCATION (RECOMMENDED)                      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'subject' && (
        <div className="space-y-4">

          {/* Class Filter Pills */}
          {classes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-[#243b4a]/60 mr-1 flex items-center gap-1">
                <Layers size={13} /> Filter Class:
              </span>
              <button
                onClick={() => setSelectedClassFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedClassFilter === 'all'
                    ? 'bg-[#243b4a] text-white shadow-2xs'
                    : 'bg-white text-[#243b4a] border border-[#243b4a]/15 hover:bg-[#eff2f5]'
                }`}
              >
                All Classes ({classes.length})
              </button>
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassFilter(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    selectedClassFilter === c.id
                      ? 'bg-[#243b4a] text-white shadow-2xs'
                      : 'bg-white text-[#243b4a] border border-[#243b4a]/15 hover:bg-[#eff2f5]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Classes & Subjects Cards */}
          {filteredClasses.map(cls => {
            const classSubjects = subjects.filter(s => s.classId === cls.id);
            const allocationUnits = getSubjectAllocationUnits(classSubjects);

            return (
              <div key={cls.id} className="bg-white border border-[#243b4a]/15 rounded-xl overflow-hidden shadow-2xs">
                {/* Class Title Header */}
                <div className="px-4 py-3 bg-[#243b4a]/5 border-b border-[#243b4a]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff732e]" />
                    <h3 className="text-xs font-black text-[#243b4a]">{cls.label}</h3>
                    <span className="text-xs font-bold text-[#243b4a]/50">
                      ({allocationUnits.length} course stream{allocationUnits.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Subject Allocations List */}
                {allocationUnits.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#243b4a]/40 italic font-medium">
                    No subjects in this class. Return to Step 2 to add subjects.
                  </div>
                ) : (
                  <div className="divide-y divide-[#243b4a]/10">
                    {allocationUnits.map(item => {
                      const currentAllocations = getSubjectAllocations(item.allocId, cls.id, teachers, subjects);
                      const totalAllocated = currentAllocations.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
                      const requiredHours = item.hoursPerWeek;
                      const isComplete = totalAllocated === requiredHours;
                      const isExceeded = totalAllocated > requiredHours;

                      return (
                        <div key={item.allocId} className={`p-4 space-y-3 transition-colors ${
                          item.isElectiveOption ? 'bg-[#ff732e]/5 hover:bg-[#ff732e]/10' : 'hover:bg-[#eff2f5]/30'
                        }`}>

                          {/* Subject Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.isElectiveOption ? (
                                <span className="text-xs font-black text-[#243b4a] flex items-center gap-1.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff732e] text-white font-black">
                                    Option {item.optionIndex + 1}
                                  </span>
                                  <span>{item.name}</span>
                                </span>
                              ) : (
                                <span className="text-xs font-black text-[#243b4a]">{item.name}</span>
                              )}

                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#243b4a]/10 text-[#243b4a]">
                                Required: {requiredHours} hrs/wk
                              </span>

                              {/* Joint Lecture Badge */}
                              {item.isCombined && (item.combinedWithClasses || []).length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800">
                                  <Users2 size={11} className="text-indigo-600" />
                                  Joint with: {(item.combinedWithClasses || []).map(id => classes.find(c => c.id === id)?.label || id).join(', ')}
                                </span>
                              )}

                              {/* Elective Badge */}
                              {item.isElective && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#ff732e]/15 border border-[#ff732e]/30 text-[#e8611d]">
                                  {item.isElectiveOption ? `Elective Group (${item.groupTitle})` : 'Elective Group'}
                                </span>
                              )}
                            </div>

                            {/* Allocation Status Badge & Quick Split Button */}
                            <div className="flex items-center gap-2">
                              {currentAllocations.length >= 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleSplitEvenly(item, cls.id)}
                                  className="text-[10px] font-bold text-[#ff732e] hover:underline px-1 py-0.5"
                                  title="Evenly divide the total hours among the assigned co-teachers"
                                >
                                  ⚖ Split Evenly
                                </button>
                              )}

                              <div className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 border ${
                                isComplete
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isExceeded
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {isComplete ? (
                                  <>
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    <span>{totalAllocated} / {requiredHours} hrs (Complete)</span>
                                  </>
                                ) : isExceeded ? (
                                  <>
                                    <AlertCircle size={12} className="text-rose-600" />
                                    <span>{totalAllocated} / {requiredHours} hrs (+{totalAllocated - requiredHours} hr over)</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={12} className="text-amber-600" />
                                    <span>{totalAllocated} / {requiredHours} hrs ({requiredHours - totalAllocated} hr left)</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Co-Teachers Allocation Rows */}
                          <div className="space-y-2 pl-2 border-l-2 border-[#243b4a]/20">
                            {currentAllocations.length === 0 ? (
                              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#243b4a]/10 text-xs shadow-3xs">
                                <span className="text-[#243b4a]/60 font-semibold italic">
                                  No faculty assigned to {item.name}. Click "Assign Teacher" to set up.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddCoTeacher(item, cls.id)}
                                  className="btn-primary text-xs py-1 px-2.5 font-bold"
                                >
                                  + Assign Teacher
                                </button>
                              </div>
                            ) : (
                              currentAllocations.map((alloc, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-[#243b4a]/15 shadow-3xs"
                                >
                                  {/* Teacher Selector */}
                                  <div className="col-span-5">
                                    <select
                                      value={alloc.teacherId}
                                      onChange={e => handleUpdateAllocation(item, cls.id, aIdx, 'teacherId', e.target.value)}
                                      className="select-field text-xs py-1.5 font-bold"
                                    >
                                      {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                          {t.name || 'Unnamed Teacher'}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Component (Theory / Lab / Tutorial / Elective) */}
                                  <div className="col-span-3">
                                    <select
                                      value={alloc.component}
                                      onChange={e => handleUpdateAllocation(item, cls.id, aIdx, 'component', e.target.value)}
                                      className="select-field text-xs py-1.5 font-bold"
                                    >
                                      {SUBJECT_COMPONENTS.map(comp => (
                                        <option key={comp} value={comp}>{comp}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Assigned Hours */}
                                  <div className="col-span-3 flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={1}
                                      max={item.hoursPerWeek}
                                      value={alloc.hours}
                                      onChange={e => handleUpdateAllocation(item, cls.id, aIdx, 'hours', e.target.value)}
                                      className="input-field text-xs py-1.5 text-center font-black w-16"
                                    />
                                    <span className="text-[11px] font-bold text-[#243b4a]/60">hrs/wk</span>
                                  </div>

                                  {/* Delete Co-Teacher */}
                                  <div className="col-span-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAllocation(item, cls.id, aIdx)}
                                      className="btn-danger p-1"
                                      title="Remove teacher from this subject"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}

                            {/* Add Additional Co-Teacher Button */}
                            {currentAllocations.length > 0 && (
                              <div className="pt-1 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleAddCoTeacher(item, cls.id)}
                                  className="text-[11px] font-black text-[#ff732e] hover:underline flex items-center gap-1"
                                >
                                  + Add 2nd / 3rd Co-Teacher for {item.name}
                                </button>
                                {item.isCombined && (
                                  <span className="text-[10px] text-indigo-700 font-bold">
                                    ✓ Auto-synced across linked joint sections
                                  </span>
                                )}
                              </div>
                            )}
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

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 2: TEACHER STAFF LIST & WORKLOAD STATS                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'teacher' && (
        <div className="space-y-3">
          {teachers.length === 0 ? (
            <div className="bg-white border border-[#243b4a]/15 rounded-xl p-8 text-center text-xs text-[#243b4a]/60 font-semibold space-y-2">
              <p>No faculty members added yet.</p>
              <button onClick={handleLoadStaffPresets} className="btn-secondary text-xs">
                <Sparkles size={13} className="text-[#ff732e]" /> Load Default Faculty
              </button>
            </div>
          ) : (
            teachers.map((teacher, idx) => {
              const color = TEACHER_COLORS[idx % TEACHER_COLORS.length];
              const assignedCount = (teacher.subjects || []).length;
              const totalHours = (teacher.subjects || []).reduce(
                (sum, s) => sum + (Number(s.customHours || s.hoursPerWeek) || 0), 0
              );

              return (
                <div key={teacher.id} className="bg-white border border-[#243b4a]/15 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color.indicator || 'bg-[#243b4a]'}`} />
                    <input
                      type="text"
                      value={teacher.name}
                      onChange={e => updateTeacherName(teacher.id, e.target.value)}
                      placeholder="e.g. Dr. Alan Turing"
                      className="input-field text-xs py-1.5 flex-1 font-black"
                    />
                    <div className="flex items-center gap-2 text-xs font-bold text-[#243b4a]">
                      <span className="px-2.5 py-1 rounded-md bg-[#eff2f5] border border-[#243b4a]/10 whitespace-nowrap">
                        Workload: <strong>{totalHours} hrs/wk</strong>
                      </span>
                      <button
                        onClick={() => removeTeacher(teacher.id)}
                        className="btn-danger p-1.5"
                        title="Delete teacher"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Teacher assignments chips */}
                  {assignedCount > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1 pl-6">
                      {(teacher.subjects || []).map((asgn, aIdx) => {
                        const cls = classes.find(c => c.id === asgn.classId);
                        const resolved = getResolvedSubject(subjects, asgn.subjectId);
                        const hrs = asgn.customHours || asgn.hoursPerWeek || 0;

                        return (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#eff2f5] border border-[#243b4a]/15 text-[#243b4a]"
                          >
                            <span className="text-[#ff732e] font-extrabold">{cls?.label || asgn.classId}:</span>
                            <span>{resolved?.name || asgn.subjectId}</span>
                            <span className="px-1 rounded bg-[#243b4a]/10 text-[10px] font-black">{asgn.component || 'Theory'}</span>
                            <span className="font-black text-[#000000]">({hrs}h)</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#243b4a]/40 italic pl-6">
                      No subjects allocated yet. Switch to "Split by Subject" view above to assign teaching hours.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Validation Warning */}
      {!canProceed && (
        <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg text-xs font-bold shadow-2xs">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          <span>
            {teachers.length === 0
              ? 'Please add at least one faculty member before continuing.'
              : hasEmptyTeacherNames
              ? 'Please provide a name for all faculty members.'
              : hasDupTeacherNames
              ? 'Duplicate faculty names detected — each teacher must have a unique name.'
              : 'Please resolve allocation quota errors above.'
            }
          </span>
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
