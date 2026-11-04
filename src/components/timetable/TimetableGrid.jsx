import React, { useState } from 'react';
import { DAYS, TEACHER_COLORS, PERIOD_TIMES } from '../../constants';
import { GripVertical, AlertTriangle, ArrowLeftRight, Move } from 'lucide-react';

export default function TimetableGrid({
  cls,
  timetableData,
  teachers,
  onMoveOrSwap,
  selectedSlot,
  setSelectedSlot,
  clashMap = new Map()
}) {
  const [dragSource, setDragSource] = useState(null); // { classId, day, periodIndex }
  const [dropTarget, setDropTarget] = useState(null); // { day, periodIndex }

  const teacherColorMap = {};
  teachers.forEach((t, idx) => {
    teacherColorMap[t.id] = TEACHER_COLORS[idx % TEACHER_COLORS.length];
  });

  const daysData = timetableData || {};

  const handleDragStart = (day, pIdx, e) => {
    const payload = { classId: cls.id, day, periodIndex: pIdx };
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setDragSource(payload);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDropTarget(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (day, pIdx) => {
    setDropTarget({ day, periodIndex: pIdx });
  };

  const handleDrop = (toDay, toPeriod, e) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !data.classId || !data.day || data.periodIndex === undefined) return;
      onMoveOrSwap?.(data.classId, data.day, data.periodIndex, toDay, toPeriod);
    } catch (err) {
      console.warn('Error during timetable drop:', err);
    } finally {
      setDragSource(null);
      setDropTarget(null);
    }
  };

  const handleCellClick = (day, pIdx) => {
    if (!selectedSlot) {
      const cell = daysData[day]?.[pIdx];
      if (cell) {
        setSelectedSlot?.({
          classId: cls.id,
          day,
          periodIndex: pIdx,
          subject: cell.subject,
          isCombined: cell.isCombined,
        });
      }
    } else {
      if (selectedSlot.day === day && selectedSlot.periodIndex === pIdx) {
        setSelectedSlot?.(null);
      } else {
        onMoveOrSwap?.(selectedSlot.classId, selectedSlot.day, selectedSlot.periodIndex, day, pIdx);
        setSelectedSlot?.(null);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#243b4a]/15 p-5 space-y-4 shadow-2xs">
      {/* Grid Header */}
      <div className="flex items-center justify-between border-b border-[#243b4a]/10 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-black text-[#243b4a]">{cls.label}</h3>
          <p className="text-xs text-[#243b4a]/60 font-bold mt-0.5">
            {cls.periodsPerDay} periods per day · Drag any period card to re-order or swap
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="bg-[#243b4a]/5 text-[#243b4a] font-black text-center px-2 py-2 w-20 border border-[#243b4a]/15 uppercase tracking-wider text-[10px]">
                Period
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="bg-[#243b4a]/5 text-[#243b4a] font-black text-center px-3 py-2 border border-[#243b4a]/15 uppercase tracking-wider text-[11px]"
                  style={{ minWidth: '130px' }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cls.periodsPerDay }, (_, pIdx) => (
              <tr key={pIdx} className={pIdx % 2 === 0 ? 'bg-[#eff2f5]/40' : 'bg-white'}>
                <td className="text-center border border-[#243b4a]/15 px-2 py-2 bg-[#243b4a]/5">
                  <div className="font-black text-[#243b4a] text-xs">P{pIdx + 1}</div>
                  <div className="text-[9px] text-[#243b4a]/50 font-bold">
                    {PERIOD_TIMES[pIdx] || ''}
                  </div>
                </td>
                {DAYS.map((day) => {
                  const cell = daysData[day]?.[pIdx];
                  const clashKey = `${cls.id}::${day}::${pIdx}`;
                  const clashInfo = clashMap.get(clashKey);

                  const isSelected = selectedSlot &&
                    selectedSlot.classId === cls.id &&
                    selectedSlot.day === day &&
                    selectedSlot.periodIndex === pIdx;

                  const isBeingDragged = dragSource &&
                    dragSource.classId === cls.id &&
                    dragSource.day === day &&
                    dragSource.periodIndex === pIdx;

                  const isCurrentDropTarget = dropTarget &&
                    dropTarget.day === day &&
                    dropTarget.periodIndex === pIdx &&
                    !(dragSource?.day === day && dragSource?.periodIndex === pIdx);

                  return (
                    <td
                      key={day}
                      id={`slot-${day}-P${pIdx + 1}`}
                      data-testid={`cell-${day}-${pIdx}`}
                      data-day={day}
                      data-period={pIdx}
                      onDragOver={handleDragOver}
                      onDragEnter={() => handleDragEnter(day, pIdx)}
                      onDrop={(e) => handleDrop(day, pIdx, e)}
                      onClick={() => handleCellClick(day, pIdx)}
                      className={`border border-[#243b4a]/15 p-2 text-center transition-all cursor-pointer relative ${
                        isCurrentDropTarget
                          ? cell
                            ? 'bg-amber-100/70 border-2 border-dashed border-amber-500 scale-[1.01]'
                            : 'bg-indigo-100/70 border-2 border-dashed border-indigo-500 scale-[1.01]'
                          : isSelected
                          ? 'ring-2 ring-[#ff732e] ring-offset-1 bg-[#ff732e]/10'
                          : 'hover:bg-[#243b4a]/5'
                      }`}
                      style={{ minWidth: '130px' }}
                    >
                      {/* Drop Target Helper Badge */}
                      {isCurrentDropTarget && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md z-20 pointer-events-none shadow-md">
                          <span className="text-[10px] font-black px-2 py-1 rounded bg-[#243b4a] text-white flex items-center gap-1">
                            {cell ? <ArrowLeftRight size={11} className="text-[#ff732e]" /> : <Move size={11} className="text-[#ff732e]" />}
                            {cell ? 'Drop to Swap' : 'Drop to Move'}
                          </span>
                        </div>
                      )}

                      {cell ? (
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(day, pIdx, e)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-grab active:cursor-grabbing group transition-all ${
                            isBeingDragged ? 'opacity-40 scale-95' : 'hover:scale-[1.02]'
                          }`}
                        >
                          {cell.isElective ? (
                            <div className="rounded-md p-1.5 border border-[#ff732e]/40 bg-[#ff732e]/5 text-center shadow-3xs relative">
                              <div className="flex items-center justify-between text-[9px] font-black text-[#ff732e] uppercase tracking-wider mb-1">
                                <span className="flex items-center gap-1">
                                  <GripVertical size={11} className="text-[#243b4a]/30 group-hover:text-[#ff732e]" />
                                  <span>Elective Group</span>
                                </span>
                                {cell.isCombined && (
                                  <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[8px] font-black border border-indigo-200">
                                    Joint
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-left pl-1">
                                {(cell.assignments || []).map((asg, idx) => (
                                  <div key={idx} className="text-[11px] leading-tight">
                                    <span className="font-black text-[#243b4a]">{asg.subject}</span>
                                    <span className="text-[9px] text-[#243b4a]/60 block font-bold">{asg.teacherName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : cell.isCombined ? (
                            <div className="rounded-md p-1.5 border border-indigo-300/80 bg-indigo-50/80 text-center shadow-3xs relative">
                              <div className="text-[8.5px] font-black text-indigo-700 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                                <span className="flex items-center gap-0.5">
                                  <GripVertical size={11} className="text-indigo-400 group-hover:text-indigo-600" />
                                  <span>Joint Lecture</span>
                                </span>
                              </div>
                              <div className="text-xs font-black text-indigo-950 leading-tight">
                                {cell.subject}
                              </div>
                              <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                                {cell.component && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-200/70 font-black text-indigo-900">
                                    {cell.component}
                                  </span>
                                )}
                                <span className="text-[10px] text-[#243b4a]/80 font-bold leading-tight">
                                  {cell.teacherName}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md p-1.5 border border-[#243b4a]/15 bg-[#eff2f5]/70 text-center shadow-3xs relative">
                              <div className="flex items-center justify-end text-[9px] text-[#243b4a]/40 mb-0.5">
                                <GripVertical size={11} className="group-hover:text-[#ff732e]" />
                              </div>
                              <div className="text-xs font-black text-[#243b4a] leading-tight">
                                {cell.subject}
                              </div>
                              <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                                {cell.component && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#243b4a]/10 font-black text-[#243b4a]">
                                    {cell.component}
                                  </span>
                                )}
                                <span className="text-[10px] text-[#243b4a]/70 font-bold leading-tight">
                                  {cell.teacherName}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Double-Booking Clash Warning */}
                          {clashInfo && (
                            <div
                              className="mt-1 text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-300 rounded px-1 py-0.5 flex items-center justify-center gap-0.5 shadow-2xs"
                              title={clashInfo.message}
                            >
                              <AlertTriangle size={10} className="text-rose-600 flex-shrink-0" />
                              <span>Clash: Double-booked</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 flex flex-col items-center justify-center text-[#243b4a]/20 text-xs font-bold hover:text-[#ff732e]/60 transition-colors">
                          <span>—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff Legend */}
      <div className="pt-2 border-t border-[#243b4a]/10 flex flex-wrap gap-2 items-center text-xs font-bold text-[#243b4a]">
        <span className="text-[#243b4a]/50">Staff Legend:</span>
        {teachers
          .filter(t => t.subjects.some(s => s.classId === cls.id))
          .map((t) => {
            const color = teacherColorMap[t.id] || TEACHER_COLORS[0];
            return (
              <span key={t.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#243b4a]/15 bg-[#eff2f5] text-[#243b4a] text-[11px] font-bold">
                <span className={`w-2 h-2 rounded-full ${color?.indicator || 'bg-[#243b4a]'}`} />
                {t.name}
              </span>
            );
          })
        }
      </div>
    </div>
  );
}
