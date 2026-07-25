import React, { useState } from 'react';
import { Shield, Info, ChevronDown } from 'lucide-react';
import { DAYS } from '../../constants';

export default function Step3_Constraints({ teachers, setTeachers, onNext, onBack }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const isBlocked = (day, period) => {
    return (selectedTeacher?.blockedSlots || []).some(
      s => s.day === day && s.period === period
    );
  };

  const toggleSlot = (day, period) => {
    if (!selectedTeacher) return;
    setTeachers(prev => prev.map(t => {
      if (t.id !== selectedTeacherId) return t;
      const already = t.blockedSlots.some(s => s.day === day && s.period === period);
      return {
        ...t,
        blockedSlots: already
          ? t.blockedSlots.filter(s => !(s.day === day && s.period === period))
          : [...t.blockedSlots, { day, period }],
      };
    }));
  };

  const clearAll = () => {
    setTeachers(prev => prev.map(t =>
      t.id === selectedTeacherId ? { ...t, blockedSlots: [] } : t
    ));
  };

  const totalBlocked = teachers.reduce((sum, t) => sum + t.blockedSlots.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <Shield size={13} />
          Step 4 of 5
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">External Constraints</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Mark slots when teachers are engaged in other departments to prevent scheduling double bookings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 text-center bg-white border border-slate-200">
          <div className="text-2xl font-black text-slate-800">{teachers.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Teachers</div>
        </div>
        <div className="glass-card p-4 text-center bg-white border border-slate-200">
          <div className="text-2xl font-black text-rose-600">{totalBlocked}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Blocked Slots</div>
        </div>
      </div>

      {/* Teacher Selector */}
      {teachers.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-500 bg-white border border-slate-200">
          No teachers added yet. Go back to Step 3 to add teachers.
        </div>
      ) : (
        <>
          <div className="glass-card p-5 space-y-4 bg-white border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="label text-xs uppercase font-extrabold text-slate-400 tracking-wider">Select Teacher</label>
                <div className="relative">
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="select-field pr-8 text-sm"
                  >
                    {teachers.map((t, idx) => (
                      <option key={t.id} value={t.id}>
                        {t.name || `Teacher ${idx + 1}`}
                        {t.blockedSlots.length > 0 ? ` (${t.blockedSlots.length} blocked)` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {selectedTeacher && (
                <div className="sm:mt-6">
                  <button onClick={clearAll} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1">
                    Clear All Blocks
                  </button>
                </div>
              )}
            </div>

            {/* Grid Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-md bg-slate-50 border border-slate-200"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-md bg-rose-50 border border-rose-200"></div>
                <span>Blocked (external)</span>
              </div>
            </div>

            {/* Constraint Grid */}
            {selectedTeacher && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate" style={{ borderSpacing: '4px' }}>
                  <thead>
                    <tr>
                      <th className="text-slate-400 font-bold text-center px-2 py-1.5 w-16 uppercase tracking-wider">Period</th>
                      {DAYS.map(day => (
                        <th key={day} className="text-slate-700 font-bold text-center px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3, 4, 5].map((pIdx) => (
                      <tr key={pIdx}>
                        <td className="text-slate-500 text-xs font-bold pr-2 py-1 text-center">
                          P{pIdx + 1}
                        </td>
                        {DAYS.map((_, dIdx) => {
                          const blocked = isBlocked(dIdx, pIdx);
                          return (
                            <td key={dIdx} className="text-center p-0">
                              <button
                                onClick={() => toggleSlot(dIdx, pIdx)}
                                className={`
                                  w-full h-10 rounded-lg border transition-all duration-150 text-xs font-extrabold flex items-center justify-center
                                  ${blocked
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/80 shadow-2xs'
                                    : 'bg-slate-50/60 border-slate-200/50 text-transparent hover:bg-slate-100 hover:border-slate-300 hover:text-slate-400'
                                  }
                                `}
                                title={blocked ? 'Click to unblock' : 'Click to block'}
                              >
                                {blocked ? '✕' : '+'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary of all blocked teachers */}
          {teachers.some(t => t.blockedSlots.length > 0) && (
            <div className="glass-card p-4 space-y-2 bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" /> Blocked Slots Summary
              </h3>
              <div className="space-y-1 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100">
                {teachers.filter(t => t.blockedSlots.length > 0).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs font-semibold py-0.5">
                    <span className="text-slate-700">{t.name}</span>
                    <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {t.blockedSlots.length} slot{t.blockedSlots.length !== 1 ? 's' : ''} blocked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} className="btn-primary">
          Continue to Generate →
        </button>
      </div>
    </div>
  );
}
