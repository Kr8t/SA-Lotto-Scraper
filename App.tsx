
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateLotteryData } from './services/geminiService';
import { DrawResult, LottoGame } from './types';
import DrawTable from './components/DrawTable';

const LOADING_MESSAGES = [
  "Initializing secure connection to National Lottery archives...",
  "Searching records for the requested date range...",
  "Scraping winning numbers for Daily Lotto & PowerBall...",
  "Verifying results across multiple official sources...",
  "Validating jackpot amounts and bonus ball configurations...",
  "Applying grounding filters for data integrity...",
  "Formatting results for export-ready table display...",
  "Finalizing data processing and verifying draw IDs..."
];

const App: React.FC = () => {
  const [draws, setDraws] = useState<DrawResult[]>([]);
  const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Defaulting to the most recent week of the requested period in 2026
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState('2026-02-07');

  const loadingIntervalRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStep(0);
    
    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    try {
      const response = await generateLotteryData(startDate, endDate);
      
      if (response.errorDetail) {
        setError(response.errorDetail);
      } else if (response.draws.length === 0) {
        setError("No official results found for this specific date range. Note: 2026 dates may have limited availability.");
      }
      
      setDraws(response.draws);
      setSources(response.sources);
    } catch (err) {
      setError("An unexpected error occurred during the scraping process.");
      console.error(err);
    } finally {
      setLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, []);

  const setPresetRange = (type: 'week' | 'month' | 'year') => {
    // For 2026 context, we calculate relative to Feb 7, 2026 as the "current" date
    const current = new Date('2026-02-07');
    const start = new Date(current);
    
    if (type === 'week') {
      start.setDate(current.getDate() - 7);
    } else if (type === 'month') {
      start.setMonth(current.getMonth() - 1);
    } else if (type === 'year') {
      start.setFullYear(current.getFullYear() - 1);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(current.toISOString().split('T')[0]);
  };

  const filteredDraws = useMemo(() => {
    return filter === 'All' 
      ? draws 
      : draws.filter(d => d.game === filter);
  }, [draws, filter]);

  const exportToCSV = () => {
    if (filteredDraws.length === 0) return;

    const headers = ["Date", "Game", "Winning Numbers", "Bonus/PowerBall", "Jackpot Amount (ZAR)"];
    const csvContent = [
      headers.join(","),
      ...filteredDraws.map(draw => {
        const specialBall = draw.bonusBall || draw.powerBall || "";
        const numbers = draw.numbers.join("-");
        const date = new Date(draw.date).toLocaleDateString('en-ZA');
        const jackpot = draw.jackpotAmount || 0;
        return `"${date}","${draw.game}","${numbers}","${specialBall}","${jackpot}"`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sa_lotto_results_${filter.toLowerCase().replace(/\s/g, '_')}_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const gameOptions = ['All', ...Object.values(LottoGame)];

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-amber-100 selection:text-amber-900">
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3 group shrink-0">
              <div className="bg-amber-500 p-2 rounded-lg transition-transform group-hover:rotate-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase leading-none mb-1">Official SA Lotto Scraper</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Verified Intelligence Engine</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 lg:justify-end">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-inner">
                  <div className="flex items-center gap-1 px-2">
                    <button 
                      onClick={() => setPresetRange('week')}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Last Week
                    </button>
                    <button 
                      onClick={() => setPresetRange('month')}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Last Month
                    </button>
                    <button 
                      onClick={() => setPresetRange('year')}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Last Year
                    </button>
                  </div>
                  <div className="w-px h-4 bg-slate-700 mx-1"></div>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer p-1 text-slate-100 min-w-[120px]"
                  />
                  <span className="text-slate-500 text-[10px] font-black uppercase">To</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer p-1 text-slate-100 min-w-[120px]"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={fetchData}
                  disabled={loading}
                  className={`
                    flex-1 sm:flex-none px-6 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg text-sm 
                    hover:bg-amber-400 transition-all shadow-[0_4px_0_0_rgb(180,83,9)] active:shadow-none active:translate-y-[4px] flex items-center justify-center gap-2
                    ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                  `}
                >
                  {loading && <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent animate-spin rounded-full"></div>}
                  {loading ? 'SCRAPING...' : 'REFRESH DATA'}
                </button>
                <button 
                  onClick={exportToCSV}
                  disabled={loading || draws.length === 0}
                  className={`
                    px-4 py-2 bg-slate-700 text-white font-bold rounded-lg text-sm 
                    hover:bg-slate-600 transition-all shadow-[0_4px_0_0_rgb(51,65,85)] active:shadow-none active:translate-y-[4px] flex items-center gap-2
                    ${loading || draws.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">EXPORT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-bold">Scraper Status</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                </svg>
                Verified Sources
              </h3>
              <div className="flex flex-wrap gap-4">
                {sources.map((src, i) => (
                  <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors font-medium">
                    {src.title || "Official Results Page"}
                  </a>
                ))}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Grounding Active
              </span>
            </div>
          </div>
        )}

        <section className="mb-10 text-center relative">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">
            South African Lottery <span className="text-amber-500 relative inline-block">
              Official Results
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-amber-200/50 -z-10 rounded-full"></span>
            </span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm font-medium">
            Discover validated winning combinations and jackpots for all seven lottery games.
          </p>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/60 shadow-inner">
            <div className="relative mb-10">
              <div className="absolute -inset-8 rounded-full bg-amber-100/40 animate-ping opacity-50"></div>
              <div className="absolute -inset-2 rounded-full border-2 border-dashed border-slate-200 animate-[spin_10s_linear_infinite]"></div>
              
              <div className="relative z-10">
                <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-amber-500 border-l-transparent border-t-transparent shadow-xl ring-8 ring-white"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 bg-slate-900 rounded-full animate-pulse shadow-sm shadow-black"></div>
                </div>
              </div>
            </div>
            
            <div className="text-center max-w-md mx-auto space-y-4">
              <div className="space-y-1">
                <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-sm animate-pulse">
                  System Scraping Active
                </p>
                <div className="h-1 w-24 bg-slate-200 mx-auto rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 animate-[loading_2s_ease-in-out_infinite]"></div>
                </div>
              </div>
              
              <div className="relative h-12 flex items-center justify-center overflow-hidden">
                <p key={loadingStep} className="text-slate-500 text-sm font-medium italic animate-in slide-in-from-bottom-2 fade-in duration-500">
                  {LOADING_MESSAGES[loadingStep]}
                </p>
              </div>
              
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full inline-block">
                Refining data from multiple endpoints...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {gameOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={`
                      px-5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm
                      ${filter === opt 
                        ? 'bg-slate-900 border-slate-900 text-white translate-y-[-2px] shadow-lg shadow-slate-900/20' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:bg-slate-50 hover:-translate-y-0.5'}
                    `}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500 font-black bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 uppercase tracking-wider">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {filteredDraws.length} Draws Live
              </div>
            </div>

            <DrawTable draws={filteredDraws} filter="All" />
          </>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 py-16 text-center text-slate-400 text-xs tracking-wide">
        <div className="flex justify-center gap-6 mb-8">
            <div className="h-px w-12 bg-slate-200 self-center"></div>
            <p className="font-black text-slate-300 uppercase tracking-[0.5em]">Verification Hub</p>
            <div className="h-px w-12 bg-slate-200 self-center"></div>
        </div>
        <p className="max-w-xl mx-auto leading-relaxed font-medium">
          Powered by Gemini 3 Intelligence. Automated verification across official South African Lottery archives. 
          Please cross-reference all tickets with <a href="https://www.nationallottery.co.za/" className="text-amber-600 hover:underline font-bold">nationallottery.co.za</a>.
        </p>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
