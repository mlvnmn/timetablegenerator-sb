import React from 'react';
import { Plus, Trash2, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';
import { PRESET_CLASSES } from '../../constants';

const PERIODS_OPTIONS = [4, 5, 6, 7, 8];

function generateId() {
  return `cls_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyClass() {
  return { id: generateId(), label: '', periodsPerDay: 5 };
}

export default function Step1_Classes({ classes, setClasses, onNext }) {

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

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#243b4a]/10 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Department Classes</h2>
          <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
            Configure academic classes or student batches running in your department.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {classes.length === 0 && (
            <button onClick={loadDefaults} className="btn-secondary text-xs">
              <Sparkles size={13} className="text-[#ff732e]" /> Load 8 Defaults
            </button>
          )}
          <button onClick={addClass} className="btn-primary text-xs">
            <Plus size={14} /> Add Class
          </button>
        </div>
      </div>

      {/* Class list table */}
      {classes.length === 0 ? (
        <div className="bg-white border border-[#243b4a]/15 rounded-xl p-10 text-center space-y-3">
          <p className="text-xs font-bold text-[#243b4a]">No classes configured yet</p>
          <p className="text-xs text-[#243b4a]/60 max-w-sm mx-auto font-medium">
            Click "Add Class" above or load 8 pre-configured department defaults to start.
          </p>
          <button onClick={loadDefaults} className="btn-secondary text-xs font-bold">
            <Sparkles size={13} className="text-[#ff732e]" /> Load 8 Department Defaults
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#243b4a]/15 rounded-xl overflow-hidden shadow-2xs">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[#243b4a]/5 border-b border-[#243b4a]/10 text-[11px] font-bold text-[#243b4a]">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-7">Class Name / Batch</div>
            <div className="col-span-3">Daily Periods</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-[#243b4a]/10">
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

          <div className="p-3 bg-[#243b4a]/5 border-t border-[#243b4a]/10 flex items-center justify-between text-xs text-[#243b4a]">
            <span className="font-bold">{classes.length} class{classes.length !== 1 ? 'es' : ''} total</span>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDefaults}
                className="text-xs text-[#243b4a]/80 hover:text-[#ff732e] font-bold flex items-center gap-1"
              >
                <Sparkles size={12} className="text-[#ff732e]" /> Reset to Defaults
              </button>
              <button onClick={addClass} className="text-xs font-bold text-[#ff732e] hover:underline flex items-center gap-1">
                + Add Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation messages */}
      {hasDuplicates && (
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-lg text-xs font-bold">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
          Duplicate class names detected — each class must have a unique name.
        </div>
      )}
      {!hasDuplicates && hasEmptyLabels && classes.length > 0 && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg text-xs font-bold">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          Please enter a name for every class.
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

  return (
    <div className={`
      grid grid-cols-12 gap-3 items-center px-4 py-2.5 group
      hover:bg-[#eff2f5] transition-colors
      ${isError ? 'bg-rose-50/40' : ''}
    `}>
      <div className="col-span-1 text-center text-xs font-bold text-[#243b4a]/50">
        {index + 1}
      </div>

      <div className="col-span-7">
        <input
          type="text"
          value={cls.label}
          onChange={e => onUpdate(cls.id, 'label', e.target.value)}
          placeholder="e.g. UG 1st Year – Batch A"
          className={`
            input-field text-xs py-2 font-bold
            ${isDuplicate ? 'border-rose-300 focus:border-rose-500' : ''}
            ${isEmpty && !isDuplicate ? 'border-amber-300' : ''}
          `}
        />
      </div>

      <div className="col-span-3">
        <div className="relative">
          <select
            value={cls.periodsPerDay}
            onChange={e => onUpdate(cls.id, 'periodsPerDay', e.target.value)}
            className="select-field text-xs py-2 pr-7 font-bold"
          >
            {PERIODS_OPTIONS.map(n => (
              <option key={n} value={n}>{n} periods/day</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
        </div>
      </div>

      <div className="col-span-1 flex justify-center">
        <button
          onClick={() => onRemove(cls.id)}
          className="btn-danger p-1.5 opacity-0 group-hover:opacity-100"
          title="Remove class"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
