import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Target, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export function AICoach() {
  const { champions } = useData();
  const [analyzing, setAnalyzing] = useState(false);
  const [fandomMarkdown, setFandomMarkdown] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [queryTarget, setQueryTarget] = useState('Ahri');

  const executeDataFetch = async () => {
    setAnalyzing(true);
    setFandomMarkdown('');
    setErrorMsg('');

    try {
      // 1. Fetch OP.GG data through our Express backend
      const res = await fetch('/api/opgg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ champion: queryTarget })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error occurred contacting Firecrawl');
      }

      setFandomMarkdown(data.data?.markdown || "Data retrieved, but no content was extracted.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
      <header>
        <h1 className="text-[24px] font-sans font-bold text-text-primary">AI Strategy Coach</h1>
        <p className="text-text-secondary text-[14px]">Actionable insights derived from your recent gameplay data.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        
        <div className="glass-card p-6 border-t-4 border-t-primary">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BrainCircuit className="text-primary" size={24} />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Build Optimization</h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            In your last 5 games as Yasuo, you delayed purchasing <span className="text-white font-medium">Infinity Edge</span> until 25 minutes. 
            Data suggests moving this purchase up to the 2nd slot increases your mid-game teamfight win probability by 18%.
          </p>
          <div className="p-3 bg-background rounded border border-border-subtle font-mono text-xs text-text-secondary">
            AI Confidence: 94.2% | Sample Size: High ELO Patch 14.5
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-danger">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-danger/10 rounded-lg">
              <AlertTriangle className="text-danger" size={24} />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Vision Control Risk</h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            You are placing 40% fewer Control Wards than the Challenger average in the first 15 minutes. 
            This correlates with your high death rate (avg 3.2 deaths) to early jungle ganks.
          </p>
          <div className="w-full flex items-center gap-4 mt-2">
            <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
               <div className="bg-danger h-full w-[30%]" />
            </div>
            <span className="font-mono text-xs text-text-secondary">Your Avg: 1.2 / 15m</span>
          </div>
        </div>

        {/* Real-Time Firecrawl Data Component */}
        <div className="glass-card p-6 border-t-4 border-t-[#8B949E] md:col-span-2 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-text-secondary/10 rounded-lg">
                <Search className="text-text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Real-Time Meta Sync</h2>
                <p className="text-xs text-text-secondary italic mt-1">Powered by Firecrawl (fandom / op.gg scraping)</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={queryTarget}
                onChange={e => setQueryTarget(e.target.value)}
                className="bg-background border border-border-subtle rounded-md px-3 py-1.5 text-sm font-mono text-white focus:border-primary outline-none"
                placeholder="Target Champion"
              />
              <button 
                onClick={executeDataFetch}
                disabled={analyzing}
                className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-md text-sm font-bold tracking-tight hover:bg-primary hover:text-[#000] transition-colors disabled:opacity-50"
              >
                {analyzing ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                ANALYZE OP.GG
              </button>
            </div>
          </div>
          
          <div className="bg-background/80 flex-1 border border-border-subtle rounded-md p-4 overflow-y-auto max-h-[400px]">
             {errorMsg && (
               <div className="text-danger flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded">
                 <AlertTriangle size={16} />
                 <span className="text-sm font-medium">{errorMsg}</span>
               </div>
             )}
             
             {!errorMsg && fandomMarkdown && (
               <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                 {fandomMarkdown}
               </pre>
             )}
             
             {!errorMsg && !fandomMarkdown && !analyzing && (
               <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-50 gap-2">
                 <Search size={32} />
                 <p className="text-sm">Initiate query to fetch real-world data.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
