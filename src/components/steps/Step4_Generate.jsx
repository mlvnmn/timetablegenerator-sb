import React, { useState } from 'react';
import {
  Zap, Clock, Users, BookOpen, Cpu, AlertTriangle, CheckCircle, ChevronDown
} from 'lucide-react';
import { generateTimetable } from '../../scheduler';
import TimetableViewer from '../timetable/TimetableViewer';

export default function Step4_Generate({
  classes, subjects, teachers, timetable, setTimetable, onBack, addToast
}) {
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings]     = useState([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [generated, setGenerated]   = useState(!!timetable);

  const totalSlots = classes.reduce((sum, c) => sum + c.periodsPerDay * 5, 0);
  const totalAssignedHours = teachers.reduce(
    (sum, t) => sum + t.subjects.reduce((s2, subj) => s2 + (subj.hoursPerWeek || 0), 0), 0
  );

  const handleGenerate = () => {
    if (teachers.length === 0) {
      addToast('Please add at least one teacher before generating.', 'error');
      return;
    }
    setGenerating(true);
    setWarnings([]);

    // Build a teachers array with fully resolved subject assignments
    const baseSubjectMap = {};
    (subjects || []).forEach(s => { baseSubjectMap[s.id] = s; });

    const resolvedTeachers = teachers.map(t => ({
      ...t,
      subjects: (t.subjects || []).flatMap(a => {
        if (!a.subjectId) return [];
        const parts = a.subjectId.split('::');
        const baseId = parts[0];
        const baseSubj = baseSubjectMap[baseId];
        if (!baseSubj) return [];

        let name = baseSubj.name;
        if (parts[1] === 'elective') {
          const idx = Number(parts[2]);
          name = baseSubj.electiveSubjects?.[idx] || '';
        }

        return [{
          classId: a.classId,
          subject: name,
          hoursPerWeek: baseSubj.hoursPerWeek,
          isElective: !!baseSubj.isElective,
          electiveGroup: baseSubj.isElective ? `electiveGroup_${baseSubj.id}` : '',
        }];
      }),
    }));

    setTimeout(() => {
      try {
        const result = generateTimetable(classes, resolvedTeachers);
        setTimetable(result.timetable);
        setWarnings(result.warnings);
        setGenerated(true);
        if (result.warnings.length > 0) {
          addToast(`Generated with ${result.warnings.length} warning(s). Click to review.`, 'info');
        } else {
          addToast('Timetable generated successfully!', 'success');
        }
      } catch (err) {
        addToast(`Generation failed: ${err.message}`, 'error');
      } finally {
        setGenerating(false);
      }
    }, 80);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <Zap size={13} />
          Step 5 of 5
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Generate Timetable</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          The constraint solver will assign all subjects respecting teacher availability, daily period limits, and blocked slots.
        </p>
      </div>

      {/* Config Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen size={16}/>, label: 'Classes',       value: classes.length,           color: 'text-blue-600' },
          { icon: <Users size={16}/>,   label: 'Teachers',       value: teachers.length,           color: 'text-indigo-600' },
          { icon: <Clock size={16}/>,   label: 'Weekly Slots',   value: totalSlots,                color: 'text-sky-600'    },
          { icon: <Cpu size={16}/>,     label: 'Hours to Place', value: totalAssignedHours,        color: 'text-amber-600'  },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center bg-white border border-slate-200">
            <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <div className="text-xl font-black text-slate-800 mt-1">{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Generate Button */}
      <div className="glass-card p-6 text-center bg-white border border-slate-200 shadow-2xs space-y-3.5">
        <div className="relative inline-flex">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-sm px-8 py-3 font-bold"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Solving constraints...
              </>
            ) : (
              <>
                <Zap size={16} />
                {generated ? 'Re-Generate Timetable' : 'Generate Timetable'}
              </>
            )}
          </button>
        </div>
        {generated && !generating && (
          <p className="text-xs text-slate-400 font-medium">
            Re-generating will produce a fresh schedule (results may vary).
          </p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="glass-card border-amber-200 bg-amber-50 rounded-xl overflow-hidden shadow-2xs">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between p-4 text-amber-800 hover:bg-amber-100/60 transition-colors font-bold text-xs uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              {warnings.length} Scheduling Warning{warnings.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown size={16} className={`transition-transform ${showWarnings ? 'rotate-180' : ''}`} />
          </button>
          {showWarnings && (
            <div className="border-t border-amber-200/60 p-4 space-y-1 bg-white">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs font-semibold text-slate-600">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timetable Viewer */}
      {generated && timetable && !generating && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold">
            <CheckCircle size={15} className="text-emerald-600" />
            Timetable generated — view and download below
          </div>
          <TimetableViewer
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            timetable={timetable}
            addToast={addToast}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">← Back</button>
      </div>
    </div>
  );
}
