import React, { useState, useRef, createRef } from 'react';
import TimetableGrid from './TimetableGrid';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadZip } from '../../utils/exportUtils';

export default function TimetableViewer({ classes, subjects, teachers, timetable, addToast }) {
  const [activeClassId, setActiveClassId] = useState(classes[0]?.id || '');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Create a stable ref for each class
  const gridRefs = useRef({});
  classes.forEach(cls => {
    if (!gridRefs.current[cls.id]) {
      gridRefs.current[cls.id] = createRef();
    }
  });

  const activeClass = classes.find(c => c.id === activeClassId);
  const activeIdx   = classes.findIndex(c => c.id === activeClassId);

  const goPrev = () => {
    if (activeIdx > 0) setActiveClassId(classes[activeIdx - 1].id);
  };
  const goNext = () => {
    if (activeIdx < classes.length - 1) setActiveClassId(classes[activeIdx + 1].id);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      await downloadZip({
        classes,
        subjects,
        teachers,
        timetable,
        gridRefs: gridRefs.current,
        onProgress: setProgress,
      });
      addToast('ZIP downloaded successfully!', 'success');
    } catch (err) {
      addToast(`Download failed: ${err.message}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Bar + Download */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto pb-1">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setActiveClassId(cls.id)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150
                ${activeClassId === cls.id
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }
              `}
            >
              {cls.label}
            </button>
          ))}
        </div>

        {/* Download ZIP button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-success flex-shrink-0"
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Download size={16} />
              Download ZIP
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {downloading && (
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-2xs">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Navigation arrows + class label */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <button
          onClick={goPrev}
          disabled={activeIdx === 0}
          className="btn-secondary px-3 py-2 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center font-bold">
          <span className="text-sm text-slate-800">{activeClass?.label}</span>
          <span className="text-xs text-slate-400 ml-2 font-medium">({activeIdx + 1} of {classes.length})</span>
        </div>
        <button
          onClick={goNext}
          disabled={activeIdx === classes.length - 1}
          className="btn-secondary px-3 py-2 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid — all mounted for html2canvas, non-active shifted off-screen */}
      <div className="relative overflow-hidden" style={{ minHeight: '300px' }}>
        {classes.map(cls => {
          const isActive = cls.id === activeClassId;
          return (
            <div
              key={cls.id}
              style={
                isActive
                  ? { position: 'relative' }
                  : {
                      position: 'absolute',
                      top: 0,
                      left: '-9999px',
                      visibility: 'hidden',   // hides from user but NOT from html2canvas
                      pointerEvents: 'none',
                    }
              }
            >
              <TimetableGrid
                cls={cls}
                timetableData={timetable[cls.id]}
                teachers={teachers}
                gridRef={gridRefs.current[cls.id]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
