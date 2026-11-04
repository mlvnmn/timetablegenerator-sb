import React, { useState } from 'react';
import TimetableGrid from './TimetableGrid';
import {
  ChevronLeft, ChevronRight, FileSpreadsheet, Undo2,
  AlertTriangle, MousePointerClick, Sparkles
} from 'lucide-react';
import { exportToExcel } from '../../utils/excelUtils';
import { moveOrSwapSlot, detectTeacherClashes } from '../../utils/timetableEditUtils';

export default function TimetableViewer({
  classes, subjects, teachers, timetable, setTimetable, addToast
}) {
  const [activeClassId, setActiveClassId] = useState(classes[0]?.id || '');
  const [selectedSlot, setSelectedSlot]   = useState(null); // { classId, day, periodIndex, subject, isCombined }
  const [undoStack, setUndoStack]         = useState([]);

  const activeClass = classes.find(c => c.id === activeClassId);
  const activeIdx   = classes.findIndex(c => c.id === activeClassId);

  const goPrev = () => {
    if (activeIdx > 0) setActiveClassId(classes[activeIdx - 1].id);
  };
  const goNext = () => {
    if (activeIdx < classes.length - 1) setActiveClassId(classes[activeIdx + 1].id);
  };

  const handleDownloadExcel = () => {
    try {
      exportToExcel({ classes, subjects, teachers, timetable });
      addToast('Excel workbook exported successfully!', 'success');
    } catch (err) {
      addToast(`Excel export failed: ${err.message}`, 'error');
    }
  };

  // ── Move or Swap Slot Handler ──────────────────────────────────────────────
  const handleMoveOrSwap = (sourceClassId, fromDay, fromPeriod, toDay, toPeriod) => {
    if (!setTimetable) return;

    // Save previous state for Undo
    setUndoStack(prev => [...prev.slice(-10), timetable]);

    const result = moveOrSwapSlot({
      timetable,
      sourceClassId,
      fromDay,
      fromPeriod,
      toDay,
      toPeriod,
      classes,
    });

    if (result.actionType === 'none') return;

    setTimetable(result.updatedTimetable);

    // Build notification message
    const targetPeriodLabel = `P${toPeriod + 1}`;
    const sourceClassObj = classes.find(c => c.id === sourceClassId);
    const sourceLabel = sourceClassObj?.label || sourceClassId;

    const otherSyncedClasses = result.affectedClassLabels.filter(label => label !== sourceLabel);
    const syncNote = otherSyncedClasses.length > 0
      ? ` (auto-synced with ${otherSyncedClasses.join(' & ')})`
      : '';

    if (result.actionType === 'swap') {
      addToast(
        `Swapped "${result.sourceName}" with "${result.targetName}" at ${toDay} ${targetPeriodLabel}${syncNote}`,
        'success'
      );
    } else {
      addToast(
        `Moved "${result.sourceName}" to ${toDay} ${targetPeriodLabel}${syncNote}`,
        'success'
      );
    }
  };

  // ── Undo Last Move ─────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (undoStack.length === 0 || !setTimetable) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setTimetable(previous);
    setSelectedSlot(null);
    addToast('Reverted timetable to previous state.', 'info');
  };

  // ── Global Clash Detection ─────────────────────────────────────────────────
  const clashMap = detectTeacherClashes(timetable, classes);
  const totalClashes = Math.ceil(clashMap.size / 2);

  return (
    <div className="space-y-3">

      {/* Editor Tip & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#243b4a]/5 border border-[#243b4a]/15 px-3.5 py-2 rounded-xl text-xs font-bold text-[#243b4a]">
        <div className="flex items-center gap-2">
          <MousePointerClick size={14} className="text-[#ff732e] flex-shrink-0" />
          <span>
            <b>Interactive Grid:</b> Drag & drop or click any slot to move or swap. Joint lectures & electives sync automatically across sections.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {totalClashes > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
              <AlertTriangle size={12} className="text-rose-600" />
              {totalClashes} Double-Booking Clash{totalClashes !== 1 ? 'es' : ''}
            </span>
          )}

          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-md bg-white border border-[#243b4a]/20 text-[#243b4a] hover:bg-white/80 shadow-3xs transition-colors"
              title="Undo last move or swap"
            >
              <Undo2 size={12} className="text-[#ff732e]" />
              Undo Move ({undoStack.length})
            </button>
          )}
        </div>
      </div>

      {/* Selection Active Banner */}
      {selectedSlot && (
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#ff732e]/10 to-indigo-50 border border-[#ff732e]/30 px-3.5 py-2 rounded-xl text-xs font-bold text-[#243b4a] animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#ff732e] flex-shrink-0" />
            <span>
              Selected <b>"{selectedSlot.subject}"</b> ({selectedSlot.day} P{selectedSlot.periodIndex + 1}). Click any other slot to swap or move here.
              {selectedSlot.isCombined && <span className="ml-1 text-indigo-700 font-black">(Joint Lecture)</span>}
            </span>
          </div>
          <button
            onClick={() => setSelectedSlot(null)}
            className="text-[11px] font-black text-[#ff732e] hover:underline px-2 py-0.5"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Tab Bar + Export Excel Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#243b4a]/15 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => {
                setActiveClassId(cls.id);
                setSelectedSlot(null);
              }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-black transition-colors flex-shrink-0
                ${activeClassId === cls.id
                  ? 'bg-[#243b4a] text-white shadow-xs'
                  : 'text-[#243b4a] hover:bg-[#eff2f5]'
                }
              `}
            >
              {cls.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadExcel}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 font-extrabold shadow-xs"
            title="Download multi-sheet Excel (.xlsx) file"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Navigation arrows + active class header bar */}
      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-xl border border-[#243b4a]/15 shadow-2xs">
        <button
          onClick={goPrev}
          disabled={activeIdx === 0}
          className="btn-secondary px-2.5 py-1 disabled:opacity-30 text-xs font-bold"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="text-center font-bold">
          <span className="text-xs font-black text-[#243b4a]">{activeClass?.label}</span>
          <span className="text-xs text-[#243b4a]/50 ml-2 font-bold">({activeIdx + 1} of {classes.length})</span>
        </div>
        <button
          onClick={goNext}
          disabled={activeIdx === classes.length - 1}
          className="btn-secondary px-2.5 py-1 disabled:opacity-30 text-xs font-bold"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Active Class Grid View */}
      {activeClass && (
        <TimetableGrid
          cls={activeClass}
          timetableData={timetable[activeClass.id]}
          teachers={teachers}
          onMoveOrSwap={handleMoveOrSwap}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          clashMap={clashMap}
        />
      )}
    </div>
  );
}
