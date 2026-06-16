import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { MatchAnalysis } from './MatchAnalysis';
import { useData } from '../context/DataContext';

const MOCK_MATCHES = [
  { id: 1, champId: 'Ahri', result: 'Victory', kda: '12/2/8', kdaRatio: 10.0, length: '32:15', date: '2 hours ago', type: 'Ranked Solo' },
  { id: 2, champId: 'Yasuo', result: 'Defeat', kda: '2/10/4', kdaRatio: 0.6, length: '24:05', date: '5 hours ago', type: 'Ranked Solo' },
  { id: 3, champId: 'Jinx', result: 'Victory', kda: '15/4/11', kdaRatio: 6.5, length: '41:20', date: '1 day ago', type: 'Ranked Solo' },
  { id: 4, champId: 'Ahri', result: 'Victory', kda: '8/1/14', kdaRatio: 22.0, length: '28:40', date: '1 day ago', type: 'Ranked Flex' },
  { id: 5, champId: 'Yasuo', result: 'Victory', kda: '9/6/5', kdaRatio: 2.33, length: '35:10', date: '2 days ago', type: 'Ranked Solo' },
];

export function MatchHistory() {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const { champions } = useData();

  if (selectedMatchId !== null) {
    return <MatchAnalysis onBack={() => setSelectedMatchId(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
      <header>
        <h1 className="text-[24px] font-sans font-bold text-text-primary">Match History</h1>
        <p className="text-text-secondary text-[14px]">Recent performance and aggregated statistics.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Aggregates */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="relative w-24 h-24 rounded-full border-4 border-success flex items-center justify-center mb-2">
              <span className="font-mono text-2xl font-bold text-success">80%</span>
            </div>
            <h3 className="font-sans font-semibold text-text-primary">Win Rate</h3>
            <p className="text-xs text-text-secondary">Last 20 Matches</p>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-text-secondary">Avg KDA</span>
              <span className="font-mono font-bold text-primary">4.21</span>
            </div>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary bg-opacity-80 h-full w-[65%]" />
            </div>
          </div>
        </div>

        {/* Right Col: Table list */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {MOCK_MATCHES.map(match => {
            const champ = champions.find(c => c.id === match.champId);
            const isVictory = match.result === 'Victory';
            
            return (
              <div key={match.id} onClick={() => setSelectedMatchId(match.id)} className={cn(
                "glass-card p-4 flex items-center gap-6 relative overflow-hidden transition-colors hover:bg-card-hover cursor-pointer",
              )}>
                {/* Status bar left */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  isVictory ? "bg-success" : "bg-danger"
                )} />
                
                <div className="flex items-center gap-4 w-[200px]">
                  <img src={champ?.image} alt={match.champId} className="w-12 h-12 rounded-full border border-border-subtle" />
                  <div>
                    <h4 className={cn("font-bold text-sm", isVictory ? "text-success" : "text-danger")}>{match.result}</h4>
                    <p className="text-xs text-text-secondary">{match.type}</p>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-between">
                  <div className="text-center w-[100px]">
                    <p className="font-mono text-lg font-bold text-text-primary">{match.kda}</p>
                    <p className="text-xs text-text-secondary">{match.kdaRatio} KDA</p>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-2 text-text-secondary">
                    <Clock size={14} />
                    <span className="font-mono text-sm">{match.length}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-text-secondary">{match.date}</span>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>

      </div>
    </motion.div>
  );
}
