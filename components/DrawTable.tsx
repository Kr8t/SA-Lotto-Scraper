
import React from 'react';
import { DrawResult } from '../types';
import LottoBall from './LottoBall';

interface DrawTableProps {
  draws: DrawResult[];
  filter: string;
}

const DrawTable: React.FC<DrawTableProps> = ({ draws, filter }) => {
  const filteredDraws = filter === 'All' 
    ? draws 
    : draws.filter(d => d.game === filter);

  if (filteredDraws.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm">
        No draws found for the selected criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 font-semibold">Date</th>
            <th className="px-6 py-4 font-semibold">Game</th>
            <th className="px-6 py-4 font-semibold">Winning Numbers</th>
            <th className="px-6 py-4 font-semibold text-right">Estimated Jackpot</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredDraws.map((draw) => (
            <tr key={draw.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                {new Date(draw.date).toLocaleDateString('en-ZA', { 
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </td>
              <td className="px-6 py-4">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-bold
                  ${draw.game.includes('PowerBall') ? 'bg-red-100 text-red-700' : 
                    draw.game.includes('Daily') ? 'bg-emerald-100 text-emerald-700' : 
                    'bg-amber-100 text-amber-700'}
                `}>
                  {draw.game}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {draw.numbers.map((n, idx) => (
                    <LottoBall key={idx} number={n} />
                  ))}
                  {draw.bonusBall && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-400">+</span>
                      <LottoBall number={draw.bonusBall} type="bonus" />
                    </div>
                  )}
                  {draw.powerBall && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-400">PB</span>
                      <LottoBall number={draw.powerBall} type="powerball" />
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-right font-medium text-slate-900 tabular-nums">
                {draw.jackpotAmount ? 
                  `R ${draw.jackpotAmount.toLocaleString()}` : 
                  '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DrawTable;
