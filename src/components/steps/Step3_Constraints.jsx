import React, { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#243b4a]/10 pb-4">
        <h2 className="text-lg font-black text-[#243b4a] tracking-tight">External Constraints</h2>
        <p className="text-xs text-[#243b4a]/70 font-medium mt-0.5">
          Block unavailable timeslots for staff members who teach in other departments.
        </p>
      </div>

      {/* Teacher Selector & Grid */}
      {teachers.length === 0 ? (
        <div className="bg-white border border-[#243b4a]/15 rounded-xl p-8 text-center text-xs text-[#243b4a]/60 font-bold">
          No teachers added yet. Return to Step 3 to add staff members first.
        </div>
      ) : (
        <div className="bg-white border border-[#243b4a]/15 rounded-xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#243b4a]/10">
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-[#243b4a]">Select Staff:</label>
              <div className="relative min-w-[200px]">
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="select-field text-xs font-bold py-1.5 pr-7"
                >
                  {teachers.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Teacher ${idx + 1}`}
                      {t.blockedSlots.length > 0 ? ` (${t.blockedSlots.length} blocked)` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#243b4a]/40 pointer-events-none" />
              </div>
            </div>

            {selectedTeacher && (
              <button onClick={clearAll} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold">
                <RefreshCw size={12} className="text-[#243b4a]/60" />
                Clear Blocks
              </button>
            )}
          </div>

          {/* Grid Legend */}
          <div className="flex items-center gap-4 text-xs text-[#243b4a] font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#eff2f5] border border-[#243b4a]/20"></div>
              <span>Free Slot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#ff732e] border border-[#ff732e]"></div>
              <span>Blocked Slot</span>
            </div>
          </div>

          {/* Constraint Matrix Grid */}
          {selectedTeacher && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-separate" style={{ borderSpacing: '4px' }}>
                <thead>
                  <tr>
                    <th className="text-[#243b4a]/50 font-bold text-center px-2 py-1.5 w-14">Period</th>
                    {DAYS.map(day => (
                      <th key={day} className="text-[#243b4a] font-black text-center px-3 py-2 bg-[#243b4a]/5 border border-[#243b4a]/10 rounded-lg">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5].map((pIdx) => (
                    <tr key={pIdx}>
                      <td className="text-[#243b4a] font-black text-xs pr-2 text-center">
                        P{pIdx + 1}
                      </td>
                      {DAYS.map((_, dIdx) => {
                        const blocked = isBlocked(dIdx, pIdx);
                        return (
                          <td key={dIdx} className="text-center p-0">
                            <button
                              onClick={() => toggleSlot(dIdx, pIdx)}
                              className={`
                                w-full h-10 rounded-lg border transition-all text-xs font-bold flex items-center justify-center
                                ${blocked
                                  ? 'bg-[#ff732e] border-[#ff732e] text-white shadow-2xs'
                                  : 'bg-white border-[#243b4a]/20 text-[#243b4a] hover:bg-[#eff2f5]'
                                }
                              `}
                            >
                              {blocked ? 'Blocked' : 'Free'}
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
