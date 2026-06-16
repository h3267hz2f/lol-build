import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, X, ChevronDown } from 'lucide-react';
import { Champion } from '../types';
import { cn } from '../lib/utils';

interface ChampionSelectorProps {
  champions: Champion[];
  selectedChamp: Champion | null;
  onSelect: (champ: Champion) => void;
}

export function ChampionSelector({ champions, selectedChamp, onSelect }: ChampionSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return champions.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
  }, [champions, search]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex w-full items-center justify-between bg-card-solid border border-border-subtle hover:border-primary/50 p-2 rounded-lg transition-colors text-left group">
          {selectedChamp ? (
            <div className="flex items-center gap-3">
              <img src={selectedChamp.image} alt={selectedChamp.name} className="w-10 h-10 rounded-md object-cover" />
              <div>
                <p className="font-bold text-text-primary text-sm leading-tight">{selectedChamp.name}</p>
                <p className="text-text-secondary text-xs">{selectedChamp.title}</p>
              </div>
            </div>
          ) : (
            <span className="text-text-secondary">Select Champion...</span>
          )}
          <ChevronDown size={20} className="text-text-secondary group-hover:text-primary transition-colors mr-2" />
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[800px] max-h-[85vh] bg-background border border-border-subtle rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border-subtle shrink-0 flex items-center justify-between bg-card-solid">
              <h2 className="text-lg font-bold font-sans">选择英雄 (Select Champion)</h2>
              <Dialog.Close asChild>
                <button className="p-2 text-text-secondary hover:text-white rounded hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="p-4 shrink-0 bg-background">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                 <input 
                   type="text" 
                   autoFocus
                   placeholder="搜索英雄名称或职业 (Search Champion...)" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full bg-card-solid border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-primary transition-colors text-sm"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
                {filtered.map(champ => (
                  <button
                    key={champ.id}
                    onClick={() => {
                      onSelect(champ);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-card-hover transition-colors border border-transparent group",
                      selectedChamp?.id === champ.id ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "hover:border-border-subtle"
                    )}
                  >
                    <div className="w-16 h-16 rounded overflow-hidden shadow-sm">
                      <img src={champ.image} alt={champ.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-medium text-text-primary text-center truncate w-full" title={champ.name}>{champ.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full py-10 text-center text-text-secondary text-sm">
                    没有找到匹配的英雄 (No champions found).
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
