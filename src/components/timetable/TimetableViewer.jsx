import React, { useState } from 'react';
import TimetableGrid from './TimetableGrid';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../../utils/excelUtils';

export default function TimetableViewer({ classes, subjects, teachers, timetable, addToast }) {
  const [activeClassId, setActiveClassId] = useState(classes[0]?.id || '');

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

  return (
    <div className="space-y-3">
      {/* Tab Bar + Export Excel Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#243b4a]/15 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setActiveClassId(cls.id)}
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
        />
      )}
    </div>
  );
}
