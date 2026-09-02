import React from 'react';
import { Check, Layers, BookOpen, Users, Clock, Zap } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Classes',     desc: 'Configure classes',      icon: Layers },
  { id: 2, label: 'Subjects',    desc: 'Define workloads',       icon: BookOpen },
  { id: 3, label: 'Teachers',    desc: 'Staff assignments',      icon: Users },
  { id: 4, label: 'Constraints', desc: 'Blocked timeslots',     icon: Clock },
  { id: 5, label: 'Generate',    desc: 'Build schedule',         icon: Zap },
];

export default function StepIndicator({ currentStep, onStepClick, completedSteps }) {
  return (
    <div className="space-y-1">
      {/* ── Desktop Vertical Step List ───────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-1 w-full">
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
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left text-xs font-extrabold
                ${isActive
                  ? 'bg-[#ff732e] text-white shadow-md'
                  : isDone
                  ? 'text-white bg-white/10 hover:bg-white/20'
                  : canClick
                  ? 'text-white/90 hover:text-white hover:bg-white/10'
                  : 'text-white/60 hover:text-white disabled:opacity-60 disabled:hover:bg-transparent cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`
                  w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                  ${isActive
                    ? 'bg-black/20 text-white'
                    : isDone
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/90'
                  }
                `}>
                  {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
                </div>
                <span className="truncate">{step.label}</span>
              </div>

              {isDone && !isActive && (
                <span className="w-2 h-2 rounded-full bg-[#ff732e] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mobile Stepper ───────────────────────────────────── */}
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
                  flex items-center justify-center w-8 h-8 rounded-lg transition-all text-xs font-extrabold
                  ${isActive
                    ? 'bg-[#ff732e] text-white shadow-sm'
                    : isDone
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/80 disabled:opacity-50'
                  }
                `}
                title={step.label}
              >
                {isDone && !isActive ? <Check size={13} strokeWidth={3} /> : <StepIcon size={13} />}
              </button>
              {idx < STEPS.length - 1 && (
                <div className="w-2 h-[1px] bg-white/30" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
