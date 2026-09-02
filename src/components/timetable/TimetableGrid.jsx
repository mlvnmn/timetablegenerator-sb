import React from 'react';
import { DAYS, TEACHER_COLORS, PERIOD_TIMES } from '../../constants';

export default function TimetableGrid({ cls, timetableData, teachers }) {
  const teacherColorMap = {};
  teachers.forEach((t, idx) => {
    teacherColorMap[t.id] = TEACHER_COLORS[idx % TEACHER_COLORS.length];
  });

  const daysData = timetableData || {};

  return (
    <div className="bg-white rounded-xl border border-[#243b4a]/15 p-5 space-y-4 shadow-2xs">
      {/* Grid Header */}
      <div className="flex items-center justify-between border-b border-[#243b4a]/10 pb-3">
        <div>
          <h3 className="text-sm font-black text-[#243b4a]">{cls.label}</h3>
          <p className="text-xs text-[#243b4a]/60 font-bold mt-0.5">
            {cls.periodsPerDay} periods per day · Master Weekly Schedule
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-[#243b4a]/5 text-[#243b4a] font-black text-center px-2 py-2 w-20 border border-[#243b4a]/15 uppercase tracking-wider text-[10px]">
                Period
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="bg-[#243b4a]/5 text-[#243b4a] font-black text-center px-3 py-2 border border-[#243b4a]/15 uppercase tracking-wider text-[11px]"
                  style={{ minWidth: '120px' }}
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

                  return (
                    <td
                      key={day}
                      className="border border-[#243b4a]/15 p-2 text-center"
                      style={{ minWidth: '120px' }}
                    >
                      {cell ? (
                        cell.isElective ? (
                          <div className="rounded-md p-1.5 border border-[#ff732e]/40 bg-[#ff732e]/5 text-center">
                            <div className="text-[9px] font-black text-[#ff732e] uppercase tracking-wider mb-1">
                              Elective Group
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
                        ) : (
                          <div className="rounded-md p-1.5 border border-[#243b4a]/15 bg-[#eff2f5]/70 text-center">
                            <div className="text-xs font-black text-[#243b4a] leading-tight">
                              {cell.subject}
                            </div>
                            <div className="text-[10px] text-[#243b4a]/70 font-bold leading-tight mt-0.5">
                              {cell.teacherName}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="h-10 flex items-center justify-center text-[#243b4a]/20 text-xs font-bold">
                          —
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
