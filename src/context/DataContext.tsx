import React, { createContext, useContext, useState, useEffect } from 'react';
import { Champion, Item } from '../types';
import { CHAMPIONS as FALLBACK_CHAMPS, ITEMS as FALLBACK_ITEMS } from '../data';

interface DataContextType {
  champions: Champion[];
  items: Item[];
  version: string;
  loading: boolean;
  syncDDragon: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [champions, setChampions] = useState<Champion[]>(FALLBACK_CHAMPS);
  const [items, setItems] = useState<Item[]>(FALLBACK_ITEMS);
  const [version, setVersion] = useState<string>('14.5.1 (Fallback)');
  const [loading, setLoading] = useState(false);

  // Fallback to initial sync if component loads and data is still default
  useEffect(() => {
    syncDDragon();
  }, []);

  const syncDDragon = async () => {
    setLoading(true);
    try {
      // 1. Fetch latest patch version from DDragon
      const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      const versions = await vRes.json();
      const latest = versions[0];

      // 2. Fetch Champion definitions mapped to Data Dragon JSON format
      const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/zh_CN/championFull.json`);
      const cData = await cRes.json();
      const champsRaw = cData.data;

      // 3. Fetch Item definitions mapped to Data Dragon JSON format
      const iRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/zh_CN/item.json`);
      const iData = await iRes.json();
      const itemsRaw = iData.data;

      const newChampions: Champion[] = Object.values(champsRaw).map((c: any) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        title: c.title,
        tags: c.tags,
        image: `https://ddragon.leagueoflegends.com/cdn/${latest}/img/champion/${c.id}.png`,
        spells: c.spells ? c.spells.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          tooltip: s.tooltip,
          cooldown: s.cooldown,
          cost: s.cost
        })) : [],
        passive: c.passive,
        stats: c.stats
      }));

      const itemsMap = new Map<string, Item>();

      Object.keys(itemsRaw).forEach(key => {
        const it = itemsRaw[key];
        
        // Basic buyable check
        if (!it.gold || !it.gold.purchasable || it.gold.total <= 0 || it.name === '<attention>Obsolete</attention>') return;
        
        // Must be available on Summoner's Rift
        if (it.maps && it.maps['11'] === false) return;

        // In some localized modes or tutorials, Riot duplicates items with 6-digit IDs.
        // We'll deduplicate by item name, keeping the one with the shortest ID (canonical).
        const existing = itemsMap.get(it.name);
        if (!existing || key.length < existing.id.length || (key.length === existing.id.length && parseInt(key) < parseInt(existing.id))) {
          itemsMap.set(it.name, {
            id: key,
            name: it.name,
            plaintext: it.plaintext,
            description: it.description,
            tags: it.tags || [],
            image: `https://ddragon.leagueoflegends.com/cdn/${latest}/img/item/${key}.png`,
            gold: it.gold,
            depth: it.depth,
            stats: it.stats
          });
        }
      });

      const newItems = Array.from(itemsMap.values());

      setVersion(latest);
      setChampions(newChampions.sort((a,b) => a.name.localeCompare(b.name)));
      setItems(newItems);
    } catch (err) {
      console.error("DDragon sync failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{ champions, items, version, loading, syncDDragon }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
