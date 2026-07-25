import React from 'react';
import { DAYS, TEACHER_COLORS } from '../../constants';

/**
 * TimetableGrid
 * Renders one class's weekly timetable as a styled table.
 * gridRef is forwarded for html2canvas capture.
 */
export default function TimetableGrid({ cls, timetableData, teachers, gridRef }) {
  // Build a teacher → color index map (stable order by teachers array)
  const teacherColorMap = {};
  teachers.forEach((t, idx) => {
    teacherColorMap[t.id] = TEACHER_COLORS[idx % TEACHER_COLORS.length];
  });

  const daysData = timetableData || {};

  return (
    <div
      ref={gridRef}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 p-5 shadow-xs"
      style={{ minWidth: '600px' }}
    >
      {/* Grid Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{cls.label}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {cls.periodsPerDay} periods/day · Weekly Schedule
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-slate-50 text-slate-500 text-xs font-extrabold text-center px-2 py-2.5 rounded-tl-lg w-20 border border-slate-200">
                Period
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="bg-slate-50 text-slate-700 text-xs font-extrabold text-center px-3 py-2.5 border border-slate-200"
                  style={{ minWidth: '110px' }}
                >
                  <div>{day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cls.periodsPerDay }, (_, pIdx) => (
              <tr key={pIdx} className={pIdx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}>
                <td className="text-center border border-slate-200 px-2 py-2 bg-slate-50/50">
                  <div className="text-xs font-black text-slate-600">P{pIdx + 1}</div>
                </td>
                {DAYS.map((day) => {
                  const cell = daysData[day]?.[pIdx];
                  const color = cell ? teacherColorMap[cell.teacherId] : null;

                  return (
                    <td
                      key={day}
                      className="border border-slate-200 px-1.5 py-1.5 text-center"
                      style={{ minWidth: '110px' }}
                    >
                      {cell ? (
                        cell.isElective ? (
                          <div className="rounded-xl px-2 py-2 border text-center transition-all bg-gradient-to-br from-indigo-50/80 to-blue-50/40 border-indigo-200/60 shadow-2xs">
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-100/70 text-[8px] font-bold text-indigo-700 border border-indigo-200/40 uppercase tracking-wider mb-1">
                              Elective
                            </div>
                            <div className="space-y-1">
                              {(cell.assignments || []).map((asg, idx) => {
                                const tColor = teacherColorMap[asg.teacherId] || TEACHER_COLORS[idx % TEACHER_COLORS.length];
                                return (
                                  <div key={idx} className={`text-left border-l-2 pl-1.5 py-0.5 ${tColor.border || 'border-slate-200'}`}>
                                    <div className="text-[10px] font-bold text-slate-800 leading-tight">
                                      {asg.subject}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-semibold leading-none">
                                      {asg.teacherName}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className={`
                            rounded-xl px-2 py-2.5 border text-center transition-all shadow-3xs
                            ${color?.bg} ${color?.border}
                          `}>
                            <div className={`text-xs font-black leading-tight ${color?.text}`}>
                              {cell.subject}
                            </div>
                            <div className="text-slate-500 text-[10px] font-bold mt-1 leading-tight opacity-90">
                              {cell.teacherName}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="h-10 flex items-center justify-center text-slate-300 text-xs font-bold">
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {teachers
          .filter(t => t.subjects.some(s => s.classId === cls.id))
          .map((t) => {
            const color = teacherColorMap[t.id] || TEACHER_COLORS[0];
            return (
              <span
                key={t.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${color.bg} ${color.text} ${color.border} shadow-3xs`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color.indicator || 'bg-slate-400'}`}></span>
                {t.name}
              </span>
            );
          })
        }
      </div>
    </div>
  );
}
