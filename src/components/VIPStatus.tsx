import React from 'react';

interface VIPStatusProps {
  level: number;
  levelName: string;
  currentPoints: number;
  nextLevelPoints: number;
  perks: string[];
}

export default function VIPStatus({
  level,
  levelName,
  currentPoints,
  nextLevelPoints,
  perks,
}: VIPStatusProps) {
  const progressPercent = Math.min(100, Math.max(0, (currentPoints / nextLevelPoints) * 100));

  return (
    <div className="relative flex w-full flex-col bg-[radial-gradient(circle_at_top_right,#1a1b4b,#0a0c1a)] p-6 rounded-2xl shadow-2xl overflow-hidden border border-white/5">
      {/* Decorative elements */}
      <div className="absolute top-0 -left-10 size-40 bg-[#0d33f2]/20 blur-[60px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 -right-10 size-40 bg-[#ff00e5]/20 blur-[60px] rounded-full pointer-events-none"></div>

      {/* VIP Badge Section */}
      <div className="flex flex-col items-center py-4 gap-4 z-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#0d33f2]/30 blur-2xl rounded-full"></div>
          <div className="relative flex items-center justify-center size-24 rounded-full bg-white/5 backdrop-blur-md border border-slate-400/30">
            <div className="flex items-center justify-center size-20 rounded-full bg-gradient-to-tr from-slate-400 to-slate-100 shadow-lg">
              {/* Star icon placeholder */}
              <svg xmlns="http://www.w3.org/2000/svg" className="size-10 text-[#0a0c1a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#0d33f2] rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-400/50 text-white whitespace-nowrap">
            Level {level}
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight">
            {levelName}
          </h2>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-xl space-y-4 mb-6 z-10">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Progress</p>
          </div>
          <p className="text-slate-100 text-sm font-medium tracking-tight">
            {currentPoints} <span className="text-slate-500">/ {nextLevelPoints} XP</span>
          </p>
        </div>
        <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ff00e5] to-[#00f2ff] shadow-[0_0_10px_rgba(255,0,229,0.4)]" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Current Perks Section */}
      <div className="space-y-3 z-10">
        <h3 className="text-base font-bold text-slate-100 px-1">Current Perks</h3>
        <div className="grid gap-2">
          {perks.map((perk, idx) => {
            const colors = ['text-[#ff00e5] bg-[#ff00e5]/20', 'text-[#00f2ff] bg-[#00f2ff]/20', 'text-[#0d33f2] bg-[#0d33f2]/20'];
            const colorClass = colors[idx % colors.length];
            return (
              <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/5 flex items-center p-3 rounded-xl gap-4">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-slate-100 font-bold text-sm">{perk}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
