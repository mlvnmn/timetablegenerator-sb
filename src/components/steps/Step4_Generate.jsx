import React, { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { generateTimetable } from '../../scheduler';
import TimetableViewer from '../timetable/TimetableViewer';
import { calculateSubjectAllocations } from '../../utils/allocationUtils';

export default function Step4_Generate({
  classes, subjects, teachers, timetable, setTimetable, onBack, addToast
}) {
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings]     = useState([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [generated, setGenerated]   = useState(!!timetable);

  const handleGenerate = () => {
    if (teachers.length === 0) {
      addToast('Please add at least one teacher before generating.', 'error');
      return;
    }

    const { allocations, errors } = calculateSubjectAllocations(classes, subjects, teachers);
    if (errors.length > 0) {
      addToast(`Cannot generate: ${errors[0].message}`, 'error');
      return;
    }

    setGenerating(true);
    setWarnings([]);

    const baseSubjectMap = {};
    (subjects || []).forEach(s => { baseSubjectMap[s.id] = s; });

    const resolvedTeachers = teachers.map(t => ({
      ...t,
      subjects: (t.subjects || []).flatMap((a, index) => {
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

        const allocatedHrs = allocations.get(`${t.id}::${index}`) ?? baseSubj.hoursPerWeek;
        if (allocatedHrs <= 0) return [];

        return [{
          classId: a.classId,
          subject: name,
          hoursPerWeek: allocatedHrs,
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
          addToast(`Generated with ${result.warnings.length} warning(s).`, 'info');
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
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#243b4a]/10 pb-4">
        <h2 className="text-lg font-black text-[#243b4a] tracking-tight">Generate Timetable</h2>
        <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
          Run the CSP constraint solver to construct conflict-free weekly class schedules.
        </p>
      </div>

      {/* Generate Action Card */}
      <div className="bg-white border border-[#243b4a]/15 rounded-xl p-6 text-center space-y-3 shadow-2xs">
        <div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-xs px-6 py-2.5 font-bold shadow-xs"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Solving Constraints...
              </>
            ) : (
              <>
                <Zap size={14} />
                {generated ? 'Re-Generate Timetable' : 'Generate Timetable'}
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[#243b4a]/60 font-bold">
          {classes.length} classes · {teachers.length} teaching staff configured
        </p>
      </div>

      {/* Warnings Accordion */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden text-xs">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between p-3 text-amber-900 font-bold text-xs"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-600" />
              {warnings.length} Scheduling Warning{warnings.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown size={14} className={`transition-transform ${showWarnings ? 'rotate-180' : ''}`} />
          </button>
          {showWarnings && (
            <div className="border-t border-amber-200 p-3 space-y-1 bg-white font-medium text-slate-700">
              {warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timetable Viewer Section */}
      {generated && timetable && !generating && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-[#243b4a] bg-white border border-[#243b4a]/20 px-3.5 py-2.5 rounded-lg text-xs font-bold shadow-2xs">
            <CheckCircle2 size={15} className="text-[#ff732e] flex-shrink-0" />
            Timetable generated cleanly — view class schedules and export to Excel below
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
