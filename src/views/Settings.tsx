import React from 'react';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';

export function Settings() {
  const { version, loading, syncDDragon } = useData();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6 max-w-2xl">
      <header>
        <h1 className="text-[24px] font-sans font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-[14px]">Configure client preferences and API integrations.</p>
      </header>

      <div className="glass-card p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 border-b border-border-subtle pb-2">Data Source</h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-background p-4 rounded-lg border border-border-subtle">
              <div>
                <p className="text-sm font-medium text-primary mb-1">Data Dragon Official Stats</p>
                <p className="text-xs text-text-secondary">Synchronize core base stats and live item properties globally. Active Patch: <span className="text-white font-mono">{version}</span></p>
              </div>
              <button 
                onClick={syncDDragon} 
                disabled={loading}
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-4 py-2 rounded text-sm tracking-widest font-bold disabled:opacity-50 transition-colors"
              >
                {loading ? 'SYNCING...' : 'PULL LATEST'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 border-b border-border-subtle pb-2">API Integrations</h2>
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">Firecrawl Scraper API Key</label>
              <input type="password" placeholder="fc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary font-mono" />
              <p className="text-xs text-text-secondary mt-2">Required for fetching OP.GG and Fandom meta insights. Used dynamically in AI Coach. This must be set in your Secrets as `FIRECRAWL_API_KEY` to apply globally to backend requests.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
