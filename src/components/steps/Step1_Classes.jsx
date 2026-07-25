import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';
import { PRESET_CLASSES } from '../../constants';

const PERIODS_OPTIONS = [4, 5, 6, 7, 8];

function generateId() {
  return `cls_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyClass() {
  return { id: generateId(), label: '', periodsPerDay: 5 };
}

export default function Step1_Classes({ classes, setClasses, onNext }) {
  const [showPresetConfirm, setShowPresetConfirm] = useState(false);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const addClass = () => {
    setClasses(prev => [...prev, emptyClass()]);
  };

  const removeClass = (id) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const updateClass = (id, field, value) => {
    setClasses(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, [field]: field === 'periodsPerDay' ? Number(value) : value }
          : c
      )
    );
  };

  const loadDefaults = () => {
    setClasses(PRESET_CLASSES.map(c => ({ ...c, id: generateId() })));
    setShowPresetConfirm(false);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const labelCounts = {};
  classes.forEach(c => {
    const key = c.label.trim().toLowerCase();
    if (key) labelCounts[key] = (labelCounts[key] || 0) + 1;
  });
  const isDuplicateLabel = (label) => {
    const key = label.trim().toLowerCase();
    return key && labelCounts[key] > 1;
  };

  const hasEmptyLabels    = classes.some(c => !c.label.trim());
  const hasDuplicates     = Object.values(labelCounts).some(v => v > 1);
  const canProceed        = classes.length > 0 && !hasEmptyLabels && !hasDuplicates;

  const count6    = classes.filter(c => c.periodsPerDay === 6).length;
  const count5    = classes.filter(c => c.periodsPerDay === 5).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <BookOpen size={13} />
          Step 1 of 5
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Department Classes</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Add every class your department runs. Each class name must be unique.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Classes', value: classes.length, color: 'text-blue-600'  },
          { label: '6 Periods/Day', value: count6,         color: 'text-indigo-600' },
          { label: '5 Periods/Day', value: count5,         color: 'text-sky-600'    },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center bg-white border border-slate-200">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="glass-card border-dashed border-slate-300 p-12 bg-white flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-slate-800 font-bold">No classes added yet</p>
            <p className="text-slate-500 text-xs mt-1 max-w-xs">
              Configure your classes manually or load the 8 preset default configurations to start.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadDefaults} className="btn-secondary text-xs"><Sparkles size={13} /> Load 8 Defaults</button>
            <button onClick={addClass} className="btn-primary text-xs"><Plus size={13} /> Add Class</button>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden bg-white border border-slate-200">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
            <div className="col-span-1 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">#</div>
            <div className="col-span-7 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Name</div>
            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periods / Day</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-slate-100">
            {classes.map((cls, idx) => (
              <ClassRow
                key={cls.id}
                cls={cls}
                index={idx}
                isDuplicate={isDuplicateLabel(cls.label)}
                onUpdate={updateClass}
                onRemove={removeClass}
              />
            ))}
          </div>

          <button
            onClick={addClass}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-slate-500
                       hover:text-blue-600 hover:bg-slate-50 transition-colors duration-150
                       border-t border-slate-100 font-semibold"
          >
            <Plus size={13} /> Add another class
          </button>
        </div>
      )}

      {/* Validation messages */}
      {hasDuplicates && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-semibold">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          Duplicate class names detected — each class must have a unique name.
        </div>
      )}
      {!hasDuplicates && hasEmptyLabels && classes.length > 0 && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl text-xs font-semibold">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          Please fill in a name for every class before continuing.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <button onClick={onNext} disabled={!canProceed} className="btn-primary">
          Continue to Subjects →
        </button>
      </div>
    </div>
  );
}

function ClassRow({ cls, index, isDuplicate, onUpdate, onRemove }) {
  const isEmpty = !cls.label.trim();
  const isError = isEmpty || isDuplicate;

  const periodColor = cls.periodsPerDay >= 6
    ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
    : 'text-sky-700 bg-sky-50 border-sky-200';

  return (
    <div className={`
      grid grid-cols-12 gap-3 items-center px-4 py-3 group
      hover:bg-slate-50/50 transition-colors duration-100
      ${isError ? 'bg-red-50/40' : ''}
    `}>
      <div className="col-span-1 text-center text-xs font-extrabold text-slate-400">{index + 1}</div>

      <div className="col-span-7">
        <input
          type="text"
          value={cls.label}
          onChange={e => onUpdate(cls.id, 'label', e.target.value)}
          placeholder="e.g. UG 1st Year – Batch A"
          className={`
            input-field text-sm py-2
            ${isDuplicate ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
            ${isEmpty && !isDuplicate ? 'border-amber-300 focus:border-amber-500' : ''}
          `}
        />
        {isDuplicate && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
            <AlertCircle size={11} /> Duplicate name
          </p>
        )}
      </div>

      <div className="col-span-3">
        <div className="relative">
          <select
            value={cls.periodsPerDay}
            onChange={e => onUpdate(cls.id, 'periodsPerDay', e.target.value)}
            className={`select-field text-xs py-2 pr-8 font-bold border ${periodColor}`}
          >
            {PERIODS_OPTIONS.map(n => (
              <option key={n} value={n}>{n} periods</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="col-span-1 flex justify-center">
        <button
          onClick={() => onRemove(cls.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500
                     hover:bg-red-50 transition-all duration-150
                     opacity-0 group-hover:opacity-100"
          title="Remove class"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
