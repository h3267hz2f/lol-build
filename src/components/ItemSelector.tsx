import React, { useState, useMemo } from 'react';
import { Item } from '../types';
import { 
  Search, Sword, Target, Zap, Axe, Wand2, Droplet, Gem, Heart, Shield, ShieldHalf, Clock, Wind, HeartPulse, ArrowDownWideNarrow, ArrowUpNarrowWide 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ItemTooltip } from './ItemTooltip';

interface ItemSelectorProps {
  items: Item[];
  onSelect: (item: Item) => void;
}

const CLASS_CATEGORIES = [
  { id: 'All', label: '全部' },
  { id: 'Fighter', label: '战士' },
  { id: 'Marksman', label: '射手' },
  { id: 'Assassin', label: '刺客' },
  { id: 'Mage', label: '法师' },
  { id: 'Tank', label: '坦克' },
  { id: 'Support', label: '辅助' },
];

const STAT_CATEGORIES = [
  { id: 'Damage', label: '攻击力', icon: Sword },
  { id: 'CriticalStrike', label: '暴击几率', icon: Target },
  { id: 'AttackSpeed', label: '攻击速度', icon: Zap },
  { id: 'ArmorPenetration', label: '护甲穿透', icon: Axe },
  { id: 'SpellDamage', label: '法术强度', icon: Wand2 },
  { id: 'Mana', label: '法力回复/法力值', icon: Droplet },
  { id: 'MagicPenetration', label: '法术穿透', icon: Gem },
  { id: 'Health', label: '生命值', icon: Heart },
  { id: 'Armor', label: '护甲', icon: Shield },
  { id: 'SpellBlock', label: '魔法抗性', icon: ShieldHalf },
  { id: 'CooldownReduction', label: '技能急速', icon: Clock },
  { id: 'MovementSpeed', label: '移动速度', icon: Wind },
  { id: 'LifeSteal', label: '生命偷取/吸血', icon: HeartPulse },
];

export function ItemSelector({ items, onSelect }: ItemSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeClass, setActiveClass] = useState('All');
  const [activeStats, setActiveStats] = useState<string[]>([]);
  const [sortDesc, setSortDesc] = useState(true);

  const toggleStat = (statId: string) => {
    setActiveStats(prev => 
      prev.includes(statId) ? prev.filter(s => s !== statId) : [...prev, statId]
    );
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Search Filter
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.plaintext.toLowerCase().includes(search.toLowerCase())) return false;
      
      const tags = item.tags || [];
      
      // 2. Class Filter Heuristic (Since DDragon lacks explicit class tags, we guess based on stats)
      if (activeClass !== 'All') {
        const has = (t: string) => tags.includes(t);
        const isFighter = has('Damage') && (has('Health') || has('Armor') || has('SpellBlock'));
        const isMarksman = has('Damage') && (has('AttackSpeed') || has('CriticalStrike'));
        const isAssassin = has('Damage') && (has('ArmorPenetration') || has('NonbootsMovement'));
        const isMage = has('SpellDamage');
        const isTank = has('Health') && (has('Armor') || has('SpellBlock'));
        const isSupport = has('GoldPer') || has('Vision') || has('Active') || has('ManaRegen');

        if (activeClass === 'Fighter' && !isFighter && !has('Damage')) return false;
        if (activeClass === 'Marksman' && !isMarksman && !has('AttackSpeed')) return false;
        if (activeClass === 'Assassin' && !isAssassin && !has('ArmorPenetration')) return false;
        if (activeClass === 'Mage' && !isMage) return false;
        if (activeClass === 'Tank' && !isTank && !has('Armor')) return false;
        if (activeClass === 'Support' && !isSupport && !has('Aura')) return false;
      }

      // 3. Stat Filter
      if (activeStats.length > 0) {
        // Must include ALL selected stats
        for (const stat of activeStats) {
          if (stat === 'MovementSpeed') {
            if (!tags.includes('NonbootsMovement') && !tags.includes('Boots')) return false;
          } else if (stat === 'LifeSteal') {
             if (!tags.includes('LifeSteal') && !tags.includes('SpellVamp')) return false;
          } else {
             if (!tags.includes(stat)) return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      const depthA = a.depth || 1;
      const depthB = b.depth || 1;
      if (depthA !== depthB) {
        return sortDesc ? depthB - depthA : depthA - depthB;
      }
      return sortDesc ? b.gold.total - a.gold.total : a.gold.total - b.gold.total;
    });
  }, [items, search, activeClass, activeStats, sortDesc]);

  const groupedItems = useMemo(() => {
    const starter: Item[] = [];
    const basic: Item[] = [];
    const epic: Item[] = [];
    const legendary: Item[] = [];

    filteredItems.forEach(item => {
      const depth = item.depth || 1;
      if (depth === 1) {
        if (item.tags?.includes('Lane') || item.tags?.includes('Jungle') || item.tags?.includes('Consumable') || item.gold.total <= 450) {
          starter.push(item);
        } else {
          basic.push(item);
        }
      } else if (depth === 2) {
        epic.push(item);
      } else {
        legendary.push(item);
      }
    });

    return [
      { id: 'starter', label: 'STARTER (初始)', items: starter },
      { id: 'basic', label: 'BASIC (基础)', items: basic },
      { id: 'epic', label: 'EPIC (高级)', items: epic },
      { id: 'legendary', label: 'LEGENDARY (成装)', items: legendary },
    ].filter(g => g.items.length > 0);
  }, [filteredItems]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar: Search & Classes */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <input
              type="text"
              placeholder="搜索装备..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border-subtle rounded px-8 py-1.5 text-sm outline-none focus:border-primary transition-colors text-text-primary"
            />
          </div>
          <button 
            onClick={() => setSortDesc(!sortDesc)}
            className="p-1.5 border border-border-subtle rounded text-text-secondary hover:text-primary hover:border-primary transition-all shadow-sm bg-background"
            title={sortDesc ? "按价格降序 (点击切换升序)" : "按价格升序 (点击切换降序)"}
          >
             {sortDesc ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          {CLASS_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                 setActiveClass(cat.id);
                 setActiveStats([]); // Reset stats when class changes
              }}
              className={cn(
                "whitespace-nowrap px-3 py-1 text-xs rounded-full border transition-colors",
                activeClass === cat.id 
                  ? "bg-primary/20 border-primary text-primary font-medium" 
                  : "bg-background border-border-subtle text-text-secondary hover:border-text-secondary hover:text-text-primary"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 pt-3 gap-3">
        {/* Left Sidebar: Stats */}
        <div className="w-[40px] flex flex-col gap-2 shrink-0 py-1 overflow-y-auto custom-scrollbar items-center">
          {STAT_CATEGORIES.map(stat => {
            const Icon = stat.icon;
            const isActive = activeStats.includes(stat.id);
            return (
              <button
                key={stat.id}
                onClick={() => toggleStat(stat.id)}
                title={stat.label}
                className={cn(
                  "p-2 rounded-md transition-all group relative border",
                  isActive 
                    ? "bg-primary/20 text-primary border-primary" 
                    : "bg-background text-text-secondary border-border-subtle hover:text-text-primary hover:border-text-secondary hover:bg-card-hover"
                )}
              >
                <Icon size={16} />
                <div className="absolute left-full ml-2 px-2 py-1 bg-card-solid border border-border-subtle text-text-primary text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {stat.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Item Grid */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-background/50 rounded-lg border border-border-subtle">
           <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            
            {groupedItems.map(group => (
              <div key={group.id} className="flex flex-col gap-3">
                <h4 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider">{group.label}</h4>
                <div className="flex flex-wrap gap-3">
                  {group.items.map(item => (
                    <React.Fragment key={item.id}>
                      <ItemTooltip item={item}>
                        <div className="flex flex-col items-center gap-1 group">
                          <button 
                            draggable
                            onDragStart={(e) => {
                               e.dataTransfer.setData('application/json', JSON.stringify(item));
                               e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => onSelect(item)}
                            className="w-11 h-11 rounded border border-[#3b3f46] hover:border-[#c8aa6e] transition-all overflow-hidden shrink-0 shadow-sm relative focus:outline-none focus:ring-1 focus:ring-[#c8aa6e] cursor-grab active:cursor-grabbing bg-black/50"
                          >
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                          </button>
                          <div className="text-[11px] text-[#c8aa6e] font-mono flex items-center gap-[2px]">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="12" cy="12" r="8"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                             {item.gold.total}
                          </div>
                        </div>
                      </ItemTooltip>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}

            {groupedItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary text-sm">
                No items match your criteria.
              </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
}
