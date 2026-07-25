import React from 'react';
import { Check, Layers, BookOpen, Users, Clock, Zap } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Classes',     desc: 'Configure classes',      icon: Layers },
  { id: 2, label: 'Subjects',    desc: 'Define subjects',        icon: BookOpen },
  { id: 3, label: 'Teachers',    desc: 'Add staff & assign',     icon: Users },
  { id: 4, label: 'Constraints', desc: 'Set blocked slots',      icon: Clock },
  { id: 5, label: 'Generate',    desc: 'Build & view schedule',  icon: Zap },
];

export default function StepIndicator({ currentStep, onStepClick, completedSteps }) {
  return (
    <div>
      {/* ── Desktop Vertical Step List ───────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-1.5 w-full">
        {STEPS.map((step) => {
          const isDone   = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const canClick = isDone || step.id <= Math.max(...completedSteps, 1);
          const StepIcon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left group
                ${isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-150
                  ${isActive
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-slate-300'
                  }
                `}>
                  {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold leading-tight">{step.label}</div>
                  <div className={`text-[10px] truncate leading-tight mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                    {step.desc}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Mobile Horizontal Stepper ───────────────────────────────────── */}
      <div className="flex md:hidden items-center justify-center gap-1.5 flex-wrap">
        {STEPS.map((step, idx) => {
          const isDone   = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const canClick = isDone || step.id <= Math.max(...completedSteps, 1);
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => canClick && onStepClick(step.id)}
                disabled={!canClick}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150
                  ${isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-white border-slate-200 text-slate-400 disabled:opacity-50'
                  }
                `}
                title={step.label}
              >
                {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
              </button>
              {idx < STEPS.length - 1 && (
                <div className="w-2.5 h-[1px] bg-slate-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
