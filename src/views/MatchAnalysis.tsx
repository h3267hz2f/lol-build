import React from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useData } from '../context/DataContext';

// Mock data for match
const MATCH_DATA = {
  id: 1, 
  champId: 'Ahri', 
  result: 'Victory', 
  kda: '12/2/8', 
  length: '32:15',
  economyData: Array.from({length: 32}, (_, i) => ({ minute: i+1, self: 500 + i*350 + Math.random()*200, opponent: 500 + i*300 + Math.random()*400 })),
  damageData: [
    { name: 'Self', value: 34500, fill: '#00F2FF' },
    { name: 'Jungle', value: 18200, fill: '#161B22' },
    { name: 'Top', value: 22100, fill: '#161B22' },
    { name: 'ADC', value: 29000, fill: '#161B22' },
    { name: 'Support', value: 8500, fill: '#161B22' }
  ],
  visionScore: 45,
  visionTarget: 60
};

export function MatchAnalysis({ onBack }: { onBack: () => void }) {
  const { champions } = useData();
  const isVictory = MATCH_DATA.result === 'Victory';
  const champ = champions.find(c => c.id === MATCH_DATA.champId);
  const visionPercentage = (MATCH_DATA.visionScore / MATCH_DATA.visionTarget) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
      <header className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="p-2 glass-card hover:bg-card-hover mt-1 hover:border-primary transition-all">
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <div>
            <h1 className={cn(
              "text-[48px] font-sans font-bold leading-none tracking-tight",
              isVictory ? "text-success text-glow" : "text-danger drop-shadow-[0_0_15px_rgba(231,76,60,0.5)]"
            )}>
              {MATCH_DATA.result.toUpperCase()}
            </h1>
            <p className="text-text-secondary text-[16px] mt-2 flex items-center gap-3">
              <img src={champ?.image} alt={champ?.name} className="w-6 h-6 rounded-full border border-border-subtle" />
              <span>{champ?.name} Mid</span>
              <span>•</span>
              <span className="font-mono">{MATCH_DATA.kda}</span>
              <span>•</span>
              <span>{MATCH_DATA.length}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        
        {/* Economy Curve */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col min-h-[350px]">
          <h2 className="font-sans font-semibold text-[18px] text-text-primary mb-4">Gold Advantage Trajectory</h2>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MATCH_DATA.economyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="minute" stroke="#8B949E" tick={{ fill: '#8B949E', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#8B949E" tick={{ fill: '#8B949E', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#161B22', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                  itemStyle={{ fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#8B949E' }}
                />
                <Line type="monotone" dataKey="self" stroke="#00F2FF" strokeWidth={3} dot={false} name="Your Gold" />
                <Line type="monotone" dataKey="opponent" stroke="#E74C3C" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Opponent Gold" opacity={0.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Damage & Vision */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col flex-1 min-h-[220px]">
            <h2 className="font-sans font-semibold text-[16px] text-text-primary mb-4">Damage Allocation</h2>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MATCH_DATA.damageData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#8B949E" tick={{ fill: '#8B949E', fontSize: 12 }} width={60} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: '#161B22', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {MATCH_DATA.damageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col items-center justify-center relative min-h-[160px]">
            <h2 className="font-sans font-semibold text-[14px] text-text-secondary absolute top-4 left-4">Vision Control index</h2>
            
            <div className="relative w-28 h-28 mt-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                <circle cx="56" cy="56" r="48" stroke={isVictory ? "#2ECC71" : "#00F2FF"} strokeWidth="8" fill="none" strokeDasharray={`${visionPercentage * 3.01} 301`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold text-text-primary">{MATCH_DATA.visionScore}</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider">Score</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
