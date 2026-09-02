import React from 'react';
import { X, FileSpreadsheet } from 'lucide-react';

export default function UserGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#243b4a]/20 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#243b4a]/10 bg-white">
          <div>
            <h3 className="text-sm font-black text-[#243b4a]">Quick Start Guide</h3>
            <p className="text-xs text-[#243b4a]/60 font-semibold">How to generate conflict-free academic timetables</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#243b4a]/50 hover:text-[#243b4a] hover:bg-[#eff2f5] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#243b4a]">

          {/* 5-Step Workflow */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-extrabold text-[#243b4a]/60 uppercase tracking-wider">
              5-Step Workflow
            </h4>
            <div className="space-y-2">

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10">
                <span className="w-5 h-5 rounded bg-[#ff732e] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <div>
                  <h5 className="font-black text-[#243b4a]">Define Classes</h5>
                  <p className="text-[#243b4a]/70 mt-0.5 font-medium">
                    Add department classes/batches (e.g. <i>UG 1st Year – Batch A</i>) and set daily period limits (4–8 periods/day).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10">
                <span className="w-5 h-5 rounded bg-[#ff732e] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <div>
                  <h5 className="font-black text-[#243b4a]">Add Subjects & Workloads</h5>
                  <p className="text-[#243b4a]/70 mt-0.5 font-medium">
                    Add subject names and set weekly hours. Check <b>Elective Group</b> if courses run in parallel at the same time slot.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10">
                <span className="w-5 h-5 rounded bg-[#ff732e] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <div>
                  <h5 className="font-black text-[#243b4a]">Add Teaching Staff</h5>
                  <p className="text-[#243b4a]/70 mt-0.5 font-medium">
                    Add faculty members and map them to their assigned class subjects.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10">
                <span className="w-5 h-5 rounded bg-[#ff732e] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  4
                </span>
                <div>
                  <h5 className="font-black text-[#243b4a]">Block External Timeslots</h5>
                  <p className="text-[#243b4a]/70 mt-0.5 font-medium">
                    Select a teacher and click matrix cells to block periods when they teach in other departments to prevent double-booking.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10">
                <span className="w-5 h-5 rounded bg-[#ff732e] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  5
                </span>
                <div>
                  <h5 className="font-black text-[#243b4a]">Solve & Export Excel</h5>
                  <p className="text-[#243b4a]/70 mt-0.5 font-medium">
                    Click <b>Generate Timetable</b> to run the solver. Browse weekly grids per class and click <b>Export Excel</b> to download your schedule.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Document & Spreadsheet Pro Tips */}
          <div className="p-3 rounded-lg bg-[#eff2f5] border border-[#243b4a]/10 space-y-1.5">
            <h4 className="text-[11px] font-black text-[#243b4a] uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={13} className="text-[#ff732e]" /> Multi-Format Document Import
            </h4>
            <ul className="space-y-1 text-[#243b4a]/80 font-semibold list-disc list-inside">
              <li>Click <b>Excel Template</b> in the sidebar to download a sample spreadsheet to fill out offline.</li>
              <li>Click <b>Import Files (Excel/PDF/Word)</b> to upload single or multiple Excel (`.xlsx`), PDF (`.pdf`), or Word (`.docx`) files — data will be merged automatically.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#eff2f5] border-t border-[#243b4a]/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs px-5">
            Got it, Let's Start
          </button>
        </div>
      </div>
    </div>
  );
}
