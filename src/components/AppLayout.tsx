import React from 'react';
import { Home, History, Brain, Settings, Maximize, Minus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { PageType } from '../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function AppLayout({ children, currentPage, onPageChange }: AppLayoutProps) {
  const navItems = [
    { id: 'simulator', label: 'Build Simulator', icon: Home },
    { id: 'match-history', label: 'Match History', icon: History },
    { id: 'ai-coach', label: 'AI Coach', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Title Bar */}
      <div className="h-[40px] flex items-center justify-between px-4 bg-card-solid border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary glow" />
          </div>
          <span className="font-sans font-bold text-sm tracking-widest text-[#FFFFFF]">AIX NEXUS</span>
        </div>
        <div className="flex items-center gap-4 text-text-secondary">
          <button className="hover:text-text-primary transition-colors"><Minus size={16} /></button>
          <button className="hover:text-text-primary transition-colors"><Maximize size={14} /></button>
          <button className="hover:text-danger transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[80px] lg:w-[240px] border-r border-border-subtle bg-background flex flex-col shrink-0 transition-all duration-300">
          <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id as PageType)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                  )}
                >
                  <Icon size={20} className={cn("shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]")} />
                  <span className="hidden lg:block font-sans text-[14px] font-medium">{item.label}</span>
                  {isActive && (
                    <div className="hidden lg:block ml-auto w-1.5 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 hidden lg:block border-t border-border-subtle">
            <div className="glass-card p-3 flex items-center gap-3">
              <img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/588.png" className="w-10 h-10 rounded-full border border-border-subtle" alt="Avatar"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">Faker</p>
                <p className="text-xs text-text-secondary">Challenger 1450LP</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-[24px] overflow-y-auto overflow-x-hidden relative">
          <div className="max-w-[1440px] mx-auto h-full w-full relative z-10">
            {children}
          </div>
          
          {/* Decorative ambient background */}
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6a00ff]/5 rounded-full blur-[120px] pointer-events-none z-0" />
        </main>
      </div>
    </div>
  );
}
