
import React from 'react';

interface LottoBallProps {
  number: number;
  type?: 'standard' | 'bonus' | 'powerball';
}

const LottoBall: React.FC<LottoBallProps> = ({ number, type = 'standard' }) => {
  const bgColor = {
    standard: 'bg-yellow-400 border-yellow-500 text-slate-900',
    bonus: 'bg-blue-500 border-blue-600 text-white',
    powerball: 'bg-red-500 border-red-600 text-white'
  }[type];

  return (
    <div className={`
      w-8 h-8 md:w-10 md:h-10 
      rounded-full flex items-center justify-center 
      font-bold text-sm md:text-base border-2 shadow-sm
      ${bgColor}
      transition-transform hover:scale-110
    `}>
      {number}
    </div>
  );
};

export default LottoBall;
