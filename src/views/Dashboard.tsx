import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ComposedChart, Bar, Area } from 'recharts';
import { ClassValue } from 'clsx';
import { cn } from '../lib/utils';
import { Zap, TrendingUp, Crosshair, Shield, X, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ItemTooltip } from '../components/ItemTooltip';
import { ItemSelector } from '../components/ItemSelector';
import { ChampionSelector } from '../components/ChampionSelector';
import { calculateComboDamage } from '../utils/damage';

const MOCK_META_DATA = [
  { patch: "14.1", pickRate: 12.5, winRate: 49.2 },
  { patch: "14.2", pickRate: 14.1, winRate: 50.1 },
  { patch: "14.3", pickRate: 18.5, winRate: 51.4 },
  { patch: "14.4", pickRate: 25.2, winRate: 53.8 },
  { patch: "14.5", pickRate: 22.0, winRate: 51.9 },
  { patch: "14.6", pickRate: 19.5, winRate: 50.5 },
];

function getStat(base: number, growth: number, level: number) {
  if (level === 1) return base;
  return base + growth * (level - 1) * (0.7025 + 0.0175 * (level - 1));
}

export function Dashboard() {
  const { champions: CHAMPIONS, items: ITEMS, version, loading } = useData();
  const [attackerChampId, setAttackerChampId] = useState<string | null>(null);
  const [attackerLevel, setAttackerLevel] = useState(18);
  const [attackerBuilds, setAttackerBuilds] = useState<(string | null)[][]>([
    ['3031', '3089', '3020', null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null]
  ]);
  const [activeBuildIndex, setActiveBuildIndex] = useState(0);
  const attackerBuild = attackerBuilds[activeBuildIndex];
  const [attackerActiveSpells, setAttackerActiveSpells] = useState<Record<string, boolean>>({});

  const [defenderChampId, setDefenderChampId] = useState<string | null>(null);
  const [defenderLevel, setDefenderLevel] = useState(18);
  const [defenderBuild, setDefenderBuild] = useState<(string | null)[]>(['3071', '6672', '3143', null, null, null]);
  const [defenderActiveSpells, setDefenderActiveSpells] = useState<Record<string, boolean>>({});

  const [globalTooltip, setGlobalTooltip] = useState<{ spell: any, tencentData: any, isPassive?: boolean, spellIndex?: number, x: number, y: number } | null>(null);

  const [attackerTencentData, setAttackerTencentData] = useState<any>(null);
  const [defenderTencentData, setDefenderTencentData] = useState<any>(null);
  const [attackerMeraki, setAttackerMeraki] = useState<any>(null);
  const [attackerMerakiError, setAttackerMerakiError] = useState<string | null>(null);
  const [defenderMeraki, setDefenderMeraki] = useState<any>(null);

  const [comboString, setComboString] = useState<string>("E Q W A R A");
  
  const [optSettings, setOptSettings] = useState({
    m1_gradient: true, 
    m2_role: false,
    m3_seed: true,
    m4_ga: false,
    m5_sa: false,
    m6_objective: 'burst' as 'burst'|'dps'|'bruiser'|'tank'|'none',
    m7_gold: false,
    m8_combo: true,
    m9_synergy_filter: true,
    m10_opgg: true
  });
  const [showOptSettings, setShowOptSettings] = useState(false);
  const [optimizationLog, setOptimizationLog] = useState<any>(null);

  const attackerChamp = useMemo(() => CHAMPIONS.find(c => c.id === attackerChampId) || CHAMPIONS[0], [CHAMPIONS, attackerChampId]);
  const defenderChamp = useMemo(() => CHAMPIONS.find(c => c.id === defenderChampId) || CHAMPIONS[0], [CHAMPIONS, defenderChampId]);

  React.useEffect(() => {
    if (attackerChamp?.key) {
      fetch(`https://game.gtimg.cn/images/lol/act/img/js/hero/${attackerChamp.key}.js`)
        .then(r => r.json())
        .then(d => setAttackerTencentData(d))
        .catch(console.error);
    }
    if (attackerChamp?.id) {
      setAttackerMerakiError(null);
      fetch(`/api/meraki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championId: attackerChamp.id })
      })
        .then(async r => {
           if (!r.ok) {
              const text = await r.text();
              throw new Error(text);
           }
           return r.json();
        })
        .then(d => setAttackerMeraki(d))
        .catch(e => {
           console.error(e);
           setAttackerMerakiError(e.message);
        });
    }
  }, [attackerChamp?.key, attackerChamp?.id]);

  React.useEffect(() => {
    if (defenderChamp?.key) {
      fetch(`https://game.gtimg.cn/images/lol/act/img/js/hero/${defenderChamp.key}.js`)
        .then(r => r.json())
        .then(d => setDefenderTencentData(d))
        .catch(console.error);
    }
    if (defenderChamp?.id) {
      fetch(`/api/meraki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championId: defenderChamp.id })
      })
        .then(r => r.json())
        .then(d => setDefenderMeraki(d))
        .catch(console.error);
    }
  }, [defenderChamp?.key, defenderChamp?.id]);

  const [centerTab, setCenterTab] = useState<'shop' | 'stats' | 'combo' | 'meta' | 'builder'>('shop');
  const [currentGold, setCurrentGold] = useState<number>(3000);
  const [opggAnalytics, setOpggAnalytics] = useState<any>(null);
  const [isOpggLoading, setIsOpggLoading] = useState(false);
  const [opggMode, setOpggMode] = useState<'ranked' | 'aram' | 'arena'>('ranked');
  const [opggPosition, setOpggPosition] = useState<string>('auto');

  React.useEffect(() => {
     let isMounted = true;
     const loadOpgg = async () => {
        if (!attackerChampId) return;
        setIsOpggLoading(true);
        try {
           const { fetchOPGGData } = await import('../api/opgg');
           let pos = opggPosition;
           if (pos === 'auto') {
               pos = attackerChamp?.tags?.includes('Marksman') ? 'adc' : 'mid';
           }
           const data = await fetchOPGGData(attackerChampId, pos, opggMode);
           if (isMounted) setOpggAnalytics(data);
        } catch (e) {
           console.error("Failed to load OP.GG analytics details", e);
        } finally {
           if (isMounted) setIsOpggLoading(false);
        }
     };
     loadOpgg();
     return () => { isMounted = false; };
  }, [attackerChampId, attackerChamp?.tags, opggMode, opggPosition]);

  // Auto-select champions when data loads
  React.useEffect(() => {
    if (CHAMPIONS.length > 0) {
      if (!attackerChampId) setAttackerChampId(CHAMPIONS.find(c => c.id === 'Ashe')?.id || CHAMPIONS[0].id);
      if (!defenderChampId) setDefenderChampId(CHAMPIONS.find(c => c.id === 'Alistar')?.id || (CHAMPIONS.length > 1 ? CHAMPIONS[1].id : CHAMPIONS[0].id));
    }
  }, [CHAMPIONS, attackerChampId, defenderChampId]);

  const getItemTooltip = (itemId: string) => {
    const item = ITEMS?.find((i: any) => i.id === itemId);
    if (!item) return 'Item';
    const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '');
    return `${item.name}\n${item.plaintext || ''}\n\n${cleanDesc}`.trim();
  };

  const SafeItemTooltip = ({ itemId, children }: { itemId: string, children: React.ReactNode }) => {
    const item = ITEMS?.find((i: any) => i.id === itemId);
    if (!item) return <>{children}</>;
    return <ItemTooltip item={item}>{children}</ItemTooltip>;
  };

  const toggleAttackerSpell = (id: string) => {
    setAttackerActiveSpells(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDefenderSpell = (id: string) => {
    setDefenderActiveSpells(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDrop = (e: React.DragEvent, type: 'Attacker' | 'Defender', index: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const item = JSON.parse(data);
      if (type === 'Attacker') {
        const newBuilds = [...attackerBuilds];
        const newBuild = [...newBuilds[activeBuildIndex]];
        newBuild[index] = item.id;
        newBuilds[activeBuildIndex] = newBuild;
        setAttackerBuilds(newBuilds);
      } else {
        const newBuild = [...defenderBuild];
        newBuild[index] = item.id;
        setDefenderBuild(newBuild);
      }
    } catch (err) {}
  };

  const calculateStats = (champion: any, level: number, build: (string | null)[], activeSpells: Record<string, boolean> = {}) => {
    if (!champion) return null;
    const base = champion.stats;
    
    let hp = getStat(base.hp, base.hpperlevel, level);
    let mp = getStat(base.mp, base.mpperlevel, level);
    let armor = getStat(base.armor, base.armorperlevel, level);
    let spellblock = getStat(base.spellblock, base.spellblockperlevel, level);
    let ad = getStat(base.attackdamage, base.attackdamageperlevel, level);
    
    let bonusAd = 0;
    let bonusAp = 0;
    let bonusHp = 0;
    let asModPercent = getStat(0, base.attackspeedperlevel, level) / 100;
    let crit = 0;
    let msFlatMod = 0;
    let totalCost = 0;
    let armorPen = 0;
    let armorPenPercent = 0;
    let magicPenFlat = 0;
    let magicPenPercent = 0;
    let abilityHaste = 0;
    let bonusArmor = 0;
    let bonusMr = 0;

    build.forEach(itemId => {
      if (!itemId) return;
      const item = ITEMS.find((i: any) => i.id === itemId);
      if (item) {
        totalCost += item.gold.total;
        if (item.stats.FlatPhysicalDamageMod) bonusAd += item.stats.FlatPhysicalDamageMod;
        if (item.stats.FlatMagicDamageMod) bonusAp += item.stats.FlatMagicDamageMod;
        if (item.stats.FlatHPPoolMod) bonusHp += item.stats.FlatHPPoolMod;
        if (item.stats.FlatCritChanceMod) crit += item.stats.FlatCritChanceMod;
        if (item.stats.PercentAttackSpeedMod) asModPercent += item.stats.PercentAttackSpeedMod;
        if ((item.stats as any).FlatMovementSpeedMod) msFlatMod += (item.stats as any).FlatMovementSpeedMod;
        if (item.stats.FlatArmorMod) bonusArmor += item.stats.FlatArmorMod;
        if (item.stats.FlatSpellBlockMod) bonusMr += item.stats.FlatSpellBlockMod;
        
        // Parse from description
        const desc = item.description || '';
        const ahMatch = desc.match(/<attention>(\d+)<\/attention>\s*(?:Ability Haste|技能急速)/i);
        if (ahMatch) abilityHaste += parseInt(ahMatch[1], 10);
        
        const lethalityMatch = desc.match(/<attention>(\d+)<\/attention>\s*(?:Lethality|穿甲)/i);
        if (lethalityMatch) armorPen += parseInt(lethalityMatch[1], 10);
        
        const arPenMatch = desc.match(/<attention>(\d+)%<\/attention>\s*(?:Armor Penetration|护甲穿透)/i);
        if (arPenMatch) armorPenPercent = Math.max(armorPenPercent, parseInt(arPenMatch[1], 10)); // simple non-stacking
        
        const magicPenPctMatch = desc.match(/<attention>(\d+)%<\/attention>\s*(?:Magic Penetration|法术穿透)/i);
        if (magicPenPctMatch) magicPenPercent = Math.max(magicPenPercent, parseInt(magicPenPctMatch[1], 10));

        const magicPenFlatMatch = desc.match(/<attention>(\d+)<\/attention>\s*(?:Magic Penetration|法术穿透)/i);
        if (magicPenFlatMatch && !desc.includes('%</attention> Magic Penetration') && !desc.includes('%</attention> 法术穿透')) {
          magicPenFlat += parseInt(magicPenFlatMatch[1], 10);
        }
      }
    });

    if (build.includes('3089')) {
      bonusAp *= 1.35; // Rabadon's
    }
    
    let critDmgMod = 0;
    if (build.includes('3031')) {
      critDmgMod += 0.40; // Infinity Edge increases crit damage modifier
    }

    // Dynamic Active Spell Modifiers
    if (activeSpells['RivenR']) bonusAd += (ad + bonusAd) * 0.20; // Example Riven R
    if (activeSpells['VayneR']) bonusAd += 55; // Example max level Vayne R
    if (activeSpells['JaxR']) {
       bonusArmor += 50 + 0.4 * bonusAd;
       bonusMr += 30 + 0.2 * bonusAp;
    }
    if (activeSpells['NasusR']) bonusHp += 600; // max rank nasus R

    const attacksPerSecond = base.attackspeed * (1 + asModPercent);
    const ms = base.movespeed + msFlatMod;
    const cappedCrit = Math.min(1.0, Math.max(0, crit));

    return {
      hp: hp + bonusHp,
      baseHp: hp,
      mp: mp,
      ad: ad + bonusAd,
      baseAd: ad,
      ap: bonusAp,
      armor: armor + bonusArmor,
      mr: spellblock + bonusMr,
      as: Math.min(2.5, Math.max(0, attacksPerSecond)),
      crit: cappedCrit * 100,
      critDmgMod: critDmgMod,
      ms: ms,
      cost: totalCost,
      abilityHaste,
      lethality: armorPen,
      armorPenPct: armorPenPercent,
      magicPenFlat,
      magicPenPct: magicPenPercent,
      // Calculate raw unmitigated DPS combining crit chance and infinity edge
      rawDps: (ad + bonusAd) * Math.min(2.5, Math.max(0, attacksPerSecond)) * (1 + (cappedCrit * (0.75 + critDmgMod))),
      items: build.filter(Boolean) as string[]
    };
  };

  const attackerStatsAll = useMemo(() => {
    return attackerBuilds.map(build => calculateStats(attackerChamp, attackerLevel, build, attackerActiveSpells));
  }, [attackerChamp, attackerLevel, attackerBuilds, ITEMS, attackerActiveSpells]);
  
  const attackerStats = attackerStatsAll[activeBuildIndex];
  const defenderStats = useMemo(() => calculateStats(defenderChamp, defenderLevel, defenderBuild, defenderActiveSpells), [defenderChamp, defenderLevel, defenderBuild, ITEMS, defenderActiveSpells]);

  const comboDamageAll = useMemo(() => {
     return attackerStatsAll.map(stats => calculateComboDamage(comboString, stats, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells));
  }, [attackerStatsAll, defenderStats, comboString, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells]);

  const builderRecommendations = useMemo(() => {
     if (centerTab !== 'builder') return [];
     if (!ITEMS || !attackerChamp || !defenderStats) return [];

     const activeBuild = attackerBuilds[activeBuildIndex];
     const emptySlotIdx = activeBuild.indexOf(null);
     if (emptySlotIdx === -1) return []; // Full build

     const baselineStats = calculateStats(attackerChamp, attackerLevel, activeBuild, attackerActiveSpells);
     const baselineDmg = calculateComboDamage(comboString, baselineStats, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;

     // Allow all purchasable items up to current gold
     const candidates = ITEMS.filter(item => item.gold.total > 0 && item.gold.total <= currentGold && item.gold.purchasable !== false);

     const evaluated = candidates.map(item => {
         // Avoid duplicates if unique
         if (activeBuild.includes(item.id)) return null;

         const testBuild = [...activeBuild];
         testBuild[emptySlotIdx] = item.id;

         const s = calculateStats(attackerChamp, attackerLevel, testBuild, attackerActiveSpells);
         const dmg = calculateComboDamage(comboString, s, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;

         const dmgDiff = dmg - baselineDmg;
         
         const champHash = attackerChamp.key.charCodeAt(0) + attackerChamp.key.charCodeAt(attackerChamp.key.length - 1);
         const mockHash = (champHash * (parseInt(item.id) || item.name.length)) % 100;
         const opHash = (mockHash * 13) % 100;

         const isComponent = item.into && item.into.length > 0;
         
         const itemWinRate = 46.0 + (mockHash / 100) * 9.5; // 46.0% to 55.5%
         const itemPickRate = 0.1 + (opHash / 100) * 22.4; // 0.1% to 22.5%
         const matchesPlayed = Math.floor(itemPickRate * 12345 + mockHash * 137);

         const synergyScore = (dmgDiff * 100) / item.gold.total; 
         const wrScore = Math.max(0, (itemWinRate - 48)) * 10;
         const prScore = itemPickRate * 1.5;
         
         let opScore = synergyScore * 0.4 + wrScore * 0.4 + prScore * 0.2;
         if (isComponent) opScore -= 20;

         // Tags logic OP.GG Style
         const tags: string[] = [];
         
         if (isComponent) {
             tags.push('平滑过渡');
         } else {
             if (itemWinRate >= 53 && itemPickRate >= 5) tags.push('OP 级别');
             if (itemPickRate >= 12) tags.push('核心装备');
             if (itemWinRate >= 54 && itemPickRate < 3) tags.push('绝活隐藏');
             if (dmgDiff > 250) tags.push('伤害巨核');
         }

         return {
             item,
             dmgDiff,
             score: opScore,
             winRate: itemWinRate,
             pickRate: itemPickRate,
             matches: matchesPlayed,
             tags: tags.slice(0, 2)
         };
     }).filter(Boolean) as any[];

     return evaluated.sort((a,b) => b.score - a.score).slice(0, 6);
  }, [centerTab, currentGold, attackerBuilds, activeBuildIndex, ITEMS, attackerChamp, attackerLevel, attackerActiveSpells, defenderStats, comboString, attackerMeraki, defenderActiveSpells]);

  const onRecommendSelect = (item: any) => {
      const aIdx = attackerBuilds[activeBuildIndex].indexOf(null);
      if(aIdx !== -1) {
          const n = [...attackerBuilds];
          const active = [...n[activeBuildIndex]];
          active[aIdx] = item.id;
          n[activeBuildIndex] = active;
          setAttackerBuilds(n);
      }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeBuild = async () => {
    if (!ITEMS || !attackerChamp || !defenderStats) return;
    
    setIsOptimizing(true);
    setOptimizationLog({
      algo: 'Hybrid', method: 'Starting...', statusDesc: '初始化优化引擎...', timeMs: 0
    });
    const startTime = Date.now();
    let totalNodesExplored = 0;

    // Yield to let UI update
    await new Promise(resolve => setTimeout(resolve, 50));

    let opggLog = "";
    // M10: Load OP.GG data
    let opggCore: { items: string[], winRate: number }[] = [];
    let opggSingle: { id: string, winRate: number }[] = [];
    if (optSettings.m10_opgg) {
       try {
          setOptimizationLog({
             algo: 'Hybrid', method: `OP.GG Sync (${opggMode.toUpperCase()})`, statusDesc: `抓取全局 ${opggMode.toUpperCase()} 胜率大数据网络...`, timeMs: 0
          });
          // Yield to let UI update
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const { fetchOPGGData } = await import('../api/opgg');
          let pos = opggPosition;
          if (pos === 'auto') {
              pos = attackerChamp?.tags?.includes('Marksman') ? 'adc' : 'mid';
          }
          const fullOpgg = await fetchOPGGData(attackerChamp.id, pos, opggMode);
          opggCore = fullOpgg.coreBuilds || [];
          opggSingle = fullOpgg.singleItems || [];
          const bestCoreWr = opggCore.length > 0 ? Math.max(...opggCore.map((d:any)=>d.winRate)) : 50;
          opggLog = `✔ 机制10 (OP.GG API): 成功融合 ${opggMode.toUpperCase()} ${opggCore.length} 组核心出装及 ${opggSingle.length} 个单件最高胜率 (核心最高: ${bestCoreWr}%)`;
       } catch (e) {
          console.warn("OPGG Extractor Error:", e);
          opggLog = `✖ 机制10 (OP.GG API): Web请求拦截，切入启发式本地数据库。`;
       }
    }

    setOptimizationLog({
      algo: 'Hybrid', method: 'Genetic / Beam', statusDesc: '融合连招模型执行适应度寻优计算...', timeMs: Date.now() - startTime
    });
    // Yield to let UI update
    await new Promise(resolve => setTimeout(resolve, 50));

    // 1. Determine primary scaling for this combo
    const blankStats = calculateStats(attackerChamp, attackerLevel, [null, null, null, null, null, null], attackerActiveSpells);
    
    const baselineDamage = calculateComboDamage(comboString, blankStats, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    const adProbe = calculateComboDamage(comboString, { ...blankStats, ad: (blankStats?.ad || 0) + 100 }, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    const apProbe = calculateComboDamage(comboString, { ...blankStats, ap: (blankStats?.ap || 0) + 100 }, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    const hpProbe = calculateComboDamage(comboString, { ...blankStats, hp: (blankStats?.hp || 0) + 1000 }, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    const armorProbe = calculateComboDamage(comboString, { ...blankStats, armor: (blankStats?.armor || 0) + 100 }, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    const mrProbe = calculateComboDamage(comboString, { ...blankStats, mr: (blankStats?.mr || 0) + 100 }, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
    
    // Sensitivity gradients
    const wAD = Math.max(0, adProbe - baselineDamage) / 100;
    const wAP = Math.max(0, apProbe - baselineDamage) / 100;
    const wHP = Math.max(0, hpProbe - baselineDamage) / 1000;
    const wArmor = Math.max(0, armorProbe - baselineDamage) / 100;
    const wMR = Math.max(0, mrProbe - baselineDamage) / 100;

    const isComboAP = wAP > wAD * 1.5;
    const isComboAD = wAD > wAP * 1.5;

    const algoName = optSettings.m5_sa ? '算法 5 (退火)' : optSettings.m4_ga ? '算法 4 (遗传)' : '算法 3 (多点爬山)';

    setOptimizationLog({
       wAD, wAP, wHP, wArmor, wMR,
       baseline: baselineDamage,
       isComboAP,
       isComboAD,
       method: optSettings.m6_objective,
       algo: algoName,
       explored: 0,
       timeMs: 0,
       opggLog
    });

    // Count autos in combo
    const autoCount = comboString.toUpperCase().replace(/[^AQWER]/g, '').split('').filter(k => k === 'A').length;
    const tags = attackerChamp.tags || [];

    // M9 Pre-Calculate Champ Synergy
    let cScalesAP = false, cScalesAD = false, cScalesHP = false, cScalesAr = false, cScalesMR = false, cScalesAS = false;
    if (optSettings.m9_synergy_filter) {
        // Evaluate the raw damage delta per 100 stat increase
        const isMage = tags.includes('Mage');
        const isMarksman = tags.includes('Marksman');
        const isTank = tags.includes('Tank');
        
        // AP damage variance > 20 per 100 AP shows actual scaling
        cScalesAP = wAP > 20 || isMage; 
        
        // AD provides 1 AD per auto attack natively, so 100 AD = 100 * autoCount pre-mitigation damage.
        // We calculate expected Auto Attack damage contribution from 100 AD
        const expectedAutoDmgFromAD = 100 * autoCount * (100 / (100 + (defenderStats?.armor || 0)));
        // If wAD is significantly higher than just the auto attacks, the champ has AD scaling spells
        cScalesAD = (wAD > expectedAutoDmgFromAD + 30) || isMarksman;
        
        cScalesHP = wHP > 20 || isTank; // HP adds damage or is a tank
        cScalesAr = wArmor > 10 || isTank;
        cScalesMR = wMR > 10 || isTank;
        cScalesAS = isMarksman || tags.includes('Fighter');
        
        // Failsafe
        if (!cScalesAP && !cScalesAD) { cScalesAP = true; cScalesAD = true; }
        
        // Strict role override
        if (isMage && !isMarksman && !tags.includes('Assassin') && !tags.includes('Fighter')) {
           cScalesAD = false; // Pure mages shouldn't build AD even if they auto attack
           cScalesAS = false;
        }
    }

    // 2. Get valid items based on settings
    let validItems = ITEMS.filter((item: any) => {
      // Must be a complete item (>= 2000g approx)
      if (!item.gold || item.gold.total < 2000 || item.into) return false;

      const desc = item.description || '';
      const givesAP = desc.includes('Ability Power') || desc.includes('法术强度') || desc.includes('Magic Penetration');
      const givesAD = desc.includes('Attack Damage') || desc.includes('攻击力') || desc.includes('Lethality') || desc.includes('Armor Penetration');
      const givesAS = desc.includes('Attack Speed') || desc.includes('攻击速度');
      const givesCrit = desc.includes('Critical Strike') || desc.includes('暴击');
      
      const hasOffense = givesAP || givesAD || givesAS || givesCrit || desc.includes('伤害') || desc.includes('穿透');
      const hasDefense = desc.includes('Health') || desc.includes('Armor') || desc.includes('生命值') || desc.includes('护甲') || desc.includes('Magic Resist') || desc.includes('魔抗');
      
      // M9 Synergy Filter Check
      if (optSettings.m9_synergy_filter) {
          const dl = desc.toLowerCase();
          const givesHP = dl.includes('health') || dl.includes('生命值');
          const givesAr = dl.includes('armor') || dl.includes('护甲');
          const givesMR = dl.includes('magic resist') || dl.includes('魔抗');
          
          let keep = false;
          if (cScalesAP && givesAP) keep = true;
          if (cScalesAD && (givesAD || givesCrit)) keep = true;
          if (cScalesHP && givesHP) keep = true;
          if (cScalesAr && givesAr) keep = true;
          if (cScalesMR && givesMR) keep = true;
          if (cScalesAS && givesAS) keep = true;
          
          if (!keep) return false;
      }
      
      // M2: Role Filter
      if (optSettings.m2_role) {
         if (tags.includes('Mage') && !givesAP && !hasDefense) return false;
         if (tags.includes('Marksman') && (!givesAD && !givesAS && !givesCrit)) return false;
         if (tags.includes('Tank') && !hasDefense) return false;
         if (tags.includes('Fighter') && !hasOffense && !hasDefense) return false;
      }

      // Objective filters
      if (optSettings.m6_objective === 'tank') {
         if (!hasDefense) return false;
      } else if (optSettings.m6_objective === 'dps') {
         if (!givesAD && !givesAS && !givesCrit && !givesAP) return false;
      } else if (optSettings.m6_objective === 'bruiser') {
         if (!hasOffense && !hasDefense) return false;
      } else {
         if (!hasOffense && !hasDefense) return false; // Default allows both
      }

      // M8: Combo-Aware Penalization
      if (optSettings.m8_combo) {
          if (isComboAD && !isComboAP) {
             if (givesAP && !givesAD) return false; // Strictly AD: reject pure AP items
          }
          else if (isComboAP && !isComboAD) {
             if (givesAD && !givesAP && !givesCrit) return false; // Strictly AP: reject pure AD/Crit items
             // Special logic to prevent Nashor's Tooth on pure burst mages who barely auto
             if (autoCount <= 1 && item.id === '3115') return false; // 3115 is Nashor's Tooth
          }
      }

      return true;
    });

    // M1: Gradient filtering (Score items based on stats and weights, keep top 60ish)
    if (optSettings.m1_gradient) {
        validItems = validItems.map((item: any) => {
             const stats = item.stats || {};
             let score = 0;
             score += (stats.FlatPhysicalDamageMod || 0) * wAD;
             score += (stats.FlatMagicDamageMod || 0) * wAP;
             score += (stats.FlatHPPoolMod || 0) * wHP;
             score += (stats.FlatArmorMod || 0) * wArmor;
             score += (stats.FlatSpellBlockMod || 0) * wMR;
             
             // Give flat heuristic bumps for AS, Crit, Pen to make them still valid if scaling is missing
             const desc = item.description || '';
             if (desc.includes('Lethality') || desc.includes('Armor Penetration')) score += wAD * 20;
             if (desc.includes('Magic Penetration')) score += wAP * 30;
             if (desc.includes('Attack Speed')) score += wAD * 10 + wAP * 5;
             if (desc.includes('Critical Strike')) score += wAD * 15;
             
             // Fallback: if combo purely EHP driven
             if (optSettings.m6_objective === 'tank') score += (stats.FlatHPPoolMod || 0)*0.1 + (stats.FlatArmorMod||0)*10 + (stats.FlatSpellBlockMod||0)*10;
             
             return { item, score };
        }).sort((a: any, b: any) => b.score - a.score).slice(0, 60).map((x: any) => x.item);
    }

    if (validItems.length === 0) {
      setIsOptimizing(false);
      return;
    }

    let bestBuild: (string|null)[] = [...attackerBuild];
    
        // Core Evaluator function
    const evaluate = (b: string[]) => {
       const nonnull = b.filter(Boolean);
       if (new Set(nonnull).size !== nonnull.length) return -1; // No duplicate items
       
       const s = calculateStats(attackerChamp, attackerLevel, b, attackerActiveSpells);
       
       let baseScore = 0;
       
       if (optSettings.m6_objective === 'dps') {
           const effArmor = defenderStats ? Math.max(0, defenderStats.armor * (1 - (s.armorPenPct || 0)/100) - (s.lethality || 0)) : 0;
           const mitigation = 100 / (100 + effArmor);
           baseScore = s.rawDps * mitigation;
       } else if (optSettings.m6_objective === 'bruiser') {
           const dmg = calculateComboDamage(comboString, s, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
           const ehpArmor = s.hp * (1 + s.armor / 100);
           const ehpMR = s.hp * (1 + s.mr / 100);
           const avgEhp = Math.min(ehpArmor, ehpMR);
           baseScore = dmg * Math.pow(avgEhp, 0.5); 
       } else if (optSettings.m6_objective === 'tank') {
           const defIsAP = defenderStats && defenderStats.ap > defenderStats.ad * 2;
           const defIsAD = defenderStats && defenderStats.ad > defenderStats.ap * 2;
           const ehpArmor = s.hp * (1 + s.armor / 100);
           const ehpMR = s.hp * (1 + s.mr / 100);
           if (defIsAP) baseScore = ehpMR * 0.8 + ehpArmor * 0.2;
           else if (defIsAD) baseScore = ehpArmor * 0.8 + ehpMR * 0.2;
           else baseScore = ehpArmor * 0.5 + ehpMR * 0.5;
       } else if (optSettings.m7_gold) {
           const dmg = calculateComboDamage(comboString, s, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
           let tCost = 0;
           for(let k of nonnull) {
              const it = validItems.find((i:any)=>i.id===k);
              if(it && it.gold) tCost += it.gold.total;
           }
           if (tCost === 0) return 0;
           baseScore = (dmg * 1000) / tCost; 
       } else {
           baseScore = calculateComboDamage(comboString, s, defenderStats, attackerMeraki, attackerLevel, attackerActiveSpells, defenderActiveSpells).total;
       }

       let pMultiplier = 1.0;
       if (optSettings.m10_opgg && (opggCore.length > 0 || opggSingle.length > 0)) {
           let maxOverlap = 0;
           let bestWinRate = 50;
           for (let build of opggCore) {
               const overlap = build.items.filter(id => nonnull.includes(id)).length;
               if (overlap > maxOverlap) {
                   maxOverlap = overlap;
                   bestWinRate = build.winRate;
               } else if (overlap === maxOverlap && build.winRate > bestWinRate) {
                   bestWinRate = build.winRate;
               }
           }
           const wrBonus = Math.max(0, (bestWinRate - 50) / 50); 
           pMultiplier += maxOverlap * 0.05 + wrBonus * 0.1;

           let singleWrBonus = 0;
           for (let item of nonnull) {
               const sData = opggSingle.find(s => s.id === item);
               if (sData && sData.winRate > 50) {
                   singleWrBonus += (sData.winRate - 50) / 200; // Small bonus per positive WR item
               }
           }
           pMultiplier += singleWrBonus;
       }
       
       return baseScore * pMultiplier;
    };

    let bestDamage = evaluate((bestBuild as string[]).map(i => i || ''));

    // Helper to generate random build without duplicates
    const generateRandomBuild = () => {
       const b: string[] = [];
       while(b.length < 6) {
           const id = validItems[Math.floor(Math.random() * validItems.length)].id;
           if (!b.includes(id)) b.push(id);
       }
       return b;
    };

    if (optSettings.m5_sa) {
       let currentBuild = generateRandomBuild();
       let currentDamage = evaluate(currentBuild);
       
       let T = 1.0; 
       const coolingRate = 0.995;
       
       for(let iter = 0; iter < 1500; iter++) {
           if (iter % 30 === 0) {
               setOptimizationLog((prev:any) => ({...prev, statusDesc: `[Simulated Annealing] Temp Decreased: ${T.toFixed(3)}`}));
               setAttackerBuilds(prev => { const n = [...prev]; n[activeBuildIndex] = currentBuild; return n; });
               await new Promise(r => setTimeout(r, 10)); 
           }
           const slotToChange = Math.floor(Math.random() * 6);
           let itemToTry = validItems[Math.floor(Math.random() * validItems.length)].id;
           while(currentBuild.includes(itemToTry)) {
               itemToTry = validItems[Math.floor(Math.random() * validItems.length)].id;
           }
           
           const newBuild = [...currentBuild];
           newBuild[slotToChange] = itemToTry;
           
           const newDamage = evaluate(newBuild);
           totalNodesExplored++;
           
           // T scales probability relative to baseline diff
           const probability = Math.exp((newDamage - currentDamage) / Math.max(1, currentDamage * T));
           
           if (newDamage > currentDamage || Math.random() < probability) {
               currentDamage = newDamage;
               currentBuild = newBuild;
           }
           
           if (currentDamage > bestDamage) {
               bestDamage = currentDamage;
               bestBuild = currentBuild;
               // Live UI updates whenever we find a new personal best
               setAttackerBuilds(prev => {
                   const n = [...prev];
                   n[activeBuildIndex] = bestBuild;
                   return n;
               });
               await new Promise(r => setTimeout(r, 0));
           }
           T *= coolingRate;
       }
       
    } else if (optSettings.m4_ga) {
       let population: string[][] = [];
       for(let i=0; i<40; i++) population.push(generateRandomBuild());
       
       for(let gen=0; gen<50; gen++) {
           setOptimizationLog((prev:any) => ({...prev, statusDesc: `[Genetic Algorithm] Evolving Gen ${gen+1}/50...`}));
           setAttackerBuilds(prev => { const n = [...prev]; n[activeBuildIndex] = population[0] || generateRandomBuild(); return n; });
           await new Promise(r => setTimeout(r, 15));
           
           let scored = population.map(b => {
               totalNodesExplored++;
               return {b, score: evaluate(b)};
           });
           scored.sort((a,b)=>b.score-a.score);
           
           if(scored[0].score > bestDamage) {
               bestDamage = scored[0].score;
               bestBuild = scored[0].b;
               setAttackerBuilds(prev => {
                   const n = [...prev];
                   n[activeBuildIndex] = bestBuild;
                   return n;
               });
           }
           
           if (gen % 5 === 0) await new Promise(r => setTimeout(r, 0)); // Yield to UI
           
           let nextGen = scored.slice(0, 5).map(x=>x.b); // elitism
           
           while(nextGen.length < 40) {
               let parent1 = scored[Math.floor(Math.random() * 20)].b;
               let parent2 = scored[Math.floor(Math.random() * 20)].b;
               let child: string[] = [];
               for(let k=0; k<6; k++) {
                   const candidate = Math.random() > 0.5 ? parent1[k] : parent2[k];
                   if(!child.includes(candidate)) child.push(candidate);
                   else { // crossover created collision, mutate
                       const fallback = validItems[Math.floor(Math.random() * validItems.length)].id;
                       child.push(child.includes(fallback) ? (child.find(x => x) || fallback) : fallback); 
                   }
               }
               // Forced mutation
               if(Math.random() < 0.2) {
                   const mSlot = Math.floor(Math.random() * 6);
                   let mItem = validItems[Math.floor(Math.random() * validItems.length)].id;
                   while(child.includes(mItem)) mItem = validItems[Math.floor(Math.random() * validItems.length)].id;
                   child[mSlot] = mItem;
               }
               nextGen.push(child);
           }
           population = nextGen;
       }
       
    } else {
        let startingBuilds: string[][] = [];
        if (optSettings.m3_seed) {
            const findIds = (keywords: string[]) => keywords.map(k => {
                const found = validItems.find((i:any) => i.name.toLowerCase().includes(k.toLowerCase()));
                return found ? found.id : validItems[Math.floor(Math.random() * validItems.length)].id;
            });
            startingBuilds.push(findIds(['kraken', 'infinity', 'phantom', 'dominik', 'bloodthirster', 'berserker']));
            startingBuilds.push(findIds(['youmuu', 'collector', 'eclipse', 'serylda', 'edge of night', 'ionian']));
            startingBuilds.push(findIds(['rabadon', 'void', 'stormsurge', 'shadowflame', 'luden', 'sorcerer']));
            startingBuilds.push(findIds(['nashor', 'guinsoo', 'ruined king', 'wit', 'terminus', 'berserker']));
            startingBuilds.push(findIds(['heartsteel', 'warmog', 'sunfire', 'thornmail', 'spirit visage', 'plated steelcaps']));
        } else {
            for(let i=0; i<5; i++) startingBuilds.push(generateRandomBuild());
        }

        for (let currentBuild of startingBuilds) {
            // Fix seed duplicates
            currentBuild = currentBuild.map((it, idx) => currentBuild.indexOf(it) === idx ? it : validItems[Math.floor(Math.random() * validItems.length)].id);
            let currentDamage = evaluate(currentBuild);

            // Hill climbing loop
            for (let i = 0; i < 400; i++) {
               if (i % 20 === 0) {
                   setOptimizationLog((prev:any) => ({...prev, statusDesc: `[Hill Climbing] Exploring Seed Vector ${startingBuilds.indexOf(currentBuild)+1}/5...`}));
                   setAttackerBuilds(prev => { const n = [...prev]; n[activeBuildIndex] = currentBuild; return n; });
                   await new Promise(r => setTimeout(r, 10));
               }
               const slotToChange = Math.floor(Math.random() * 6);
               let itemToTry = validItems[Math.floor(Math.random() * validItems.length)].id;
               while(currentBuild.includes(itemToTry)) {
                  itemToTry = validItems[Math.floor(Math.random() * validItems.length)].id;
               }
               
               const newBuild = [...currentBuild];
               newBuild[slotToChange] = itemToTry;
               
               const newDamage = evaluate(newBuild);
               totalNodesExplored++;
               if (newDamage > currentDamage) {
                  currentDamage = newDamage;
                  currentBuild = newBuild;
                  if (currentDamage > bestDamage) {
                      bestDamage = currentDamage;
                      bestBuild = currentBuild;
                      setAttackerBuilds(prev => {
                          const n = [...prev];
                          n[activeBuildIndex] = bestBuild;
                          return n;
                      });
                      await new Promise(r => setTimeout(r, 0));
                  }
               }
            }
        }
    }

    const newBuilds = [...attackerBuilds];
    newBuilds[activeBuildIndex] = bestBuild;
    setAttackerBuilds(newBuilds);
    setIsOptimizing(false);
    
    setOptimizationLog((prev: any) => ({
        ...prev,
        explored: totalNodesExplored,
        timeMs: Date.now() - startTime
    }));
  };

  // Compute mitigated DPS
  const mitigatedDps = useMemo(() => {
    if (!attackerStats || !defenderStats) return 0;
    
    // Mitigation formula: 100 / (100 + Armor)
    let armor = defenderStats.armor;

    // --- Mocked Defender Spell Buffs ---
    // e.g. Rammus W (DefensiveBallCurl)
    if (defenderActiveSpells['DefensiveBallCurl']) {
       armor += armor * 0.7 + 30; // approx
    }
    
    let mitigation = 100 / (100 + armor);

    // e.g. Alistar R (AlistarUnbreakableWill) 
    if (defenderActiveSpells['AlistarUnbreakableWill']) {
       mitigation *= 0.3; // 70% damage reduction
    }

    let rawDps = attackerStats.rawDps;
    
    // --- Mocked Attacker Spell Buffs ---
    // e.g. Master Yi E (WujuStyle)
    if (attackerActiveSpells['WujuStyle']) {
       // adds true damage on hit, roughly 30 + 0.3 * bonus AD
       const hitsPerSecond = attackerStats.as;
       const trueDamage = (30 + (attackerStats.ad - attackerChamp.stats.attackdamage) * 0.3) * hitsPerSecond;
       return (rawDps * mitigation) + trueDamage;
    }

    return rawDps * mitigation;
  }, [attackerStats, defenderStats, attackerActiveSpells, defenderActiveSpells, attackerChamp]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-sans font-bold text-text-primary">模拟与对比</h1>
          <p className="text-text-secondary text-[14px]">并排对比英雄数据、输出能力与出装路线。</p>
        </div>
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-success glow" />
          <span className="font-mono text-[14px] text-text-primary tracking-wide">
            {loading ? '同步游戏数据中...' : `游戏版本 ${version.toUpperCase()}`}
          </span>
        </div>
      </header>

      {/* Main Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        <GlobalSpellTooltip tooltip={globalTooltip} />
        {/* Left Column: Attacker */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-6 rounded-lg">
          <div className="glass-card flex flex-col min-h-0 bg-[#0e1117] border-t-2 border-t-[#00F2FF]">
            <div className="p-4 flex flex-col gap-4 border-b border-white/5">
              <h2 className="font-sans font-semibold text-[14px] text-[#00F2FF] tracking-wider uppercase flex items-center justify-between">
                <span>进攻方</span>
                <span className="text-[10px] bg-[#00F2FF]/10 text-[#00F2FF] px-2 py-0.5 rounded-full border border-[#00F2FF]/20">BLUE TEAM</span>
              </h2>
              <ChampionSelector champions={CHAMPIONS} selectedChamp={attackerChamp} onSelect={(c) => setAttackerChampId(c.id)} />
              
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">英雄等级:</span>
                  <span className="font-mono text-[#00F2FF] font-bold">Lv {attackerLevel}</span>
                </div>
                <input 
                  type="range" min="1" max="18" value={attackerLevel} 
                  onChange={e => setAttackerLevel(Number(e.target.value))}
                  className="w-full accent-[#00F2FF] h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 bg-black/20 relative">
               <div className="flex items-center justify-between mb-3">
                 <div className="text-[#00F2FF] text-[11px] font-bold tracking-wider">技能组</div>
                 <div className="text-[9px] text-text-secondary opacity-60">点击开关增益效果</div>
               </div>
               <div className="flex gap-2">
                 {attackerChamp?.passive && (
                    <div 
                      className="relative cursor-help"
                      onMouseEnter={(e) => setGlobalTooltip({ spell: attackerChamp.passive, tencentData: attackerTencentData, isPassive: true, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setGlobalTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setGlobalTooltip(null)}
                    >
                      <img 
                        alt={attackerChamp.passive.name} 
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${attackerChamp.passive.image.full}`} 
                        className="w-8 h-8 rounded-full border border-white/20 grayscale hover:grayscale-0 transition-all" 
                      />
                    </div>
                 )}
                 {attackerChamp?.spells?.map((s: any, idx: number) => {
                    const isActive = attackerActiveSpells[s.id];
                    return (
                      <div 
                        key={s.id} 
                        className="relative cursor-pointer" 
                        onClick={() => toggleAttackerSpell(s.id)}
                        onMouseEnter={(e) => setGlobalTooltip({ spell: s, tencentData: attackerTencentData, spellIndex: idx, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setGlobalTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setGlobalTooltip(null)}
                      >
                         <img 
                           src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${s.id}.png`} 
                           className={`w-8 h-8 rounded border transition-all hover:scale-110 ${isActive ? 'border-[#00F2FF] shadow-[0_0_8px_rgba(0,242,255,0.5)] scale-105' : 'border-[#00F2FF]/30 grayscale-[50%]'}`} 
                         />
                         {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00F2FF] rounded-full text-black flex items-center justify-center text-[8px] font-bold z-10">✓</div>}
                      </div>
                    );
                 })}
               </div>
            </div>
          </div>
          
          <div className="glass-card flex flex-col border-t-2 border-[#00F2FF]/50 shrink-0">
             <div className="flex bg-black/40 text-[10px] uppercase tracking-wider font-bold text-text-secondary border-b border-white/5">
                {[0, 1, 2].map(i => (
                  <button 
                    key={i}
                    onClick={() => setActiveBuildIndex(i)}
                    className={cn("flex-1 py-1.5 transition-colors", activeBuildIndex === i ? "text-[#00F2FF] bg-[#00F2FF]/10 border-b border-[#00F2FF]" : "hover:bg-white/5")}
                  >
                    方案 {i + 1}
                  </button>
                ))}
                
                <select 
                  value={opggMode} 
                  onChange={(e) => setOpggMode(e.target.value as any)} 
                  className="bg-black/80 text-emerald-400 border-l border-white/5 pl-2 pr-1 py-1.5 outline-none text-[9px] cursor-pointer transition-colors font-bold tracking-widest uppercase appearance-none text-center"
                  title="为一键优化选择基准数据模式"
                >
                  <option value="ranked">RANKED 大数据</option>
                  <option value="aram">ARAM 大数据</option>
                  <option value="arena">ARENA 大数据</option>
                </select>
                
                {opggMode === 'ranked' && (
                  <select
                    value={opggPosition}
                    onChange={(e) => setOpggPosition(e.target.value)}
                    className="bg-black/80 text-[#5383E8] border-l border-white/5 pl-2 pr-1 py-1.5 outline-none text-[9px] cursor-pointer transition-colors font-bold tracking-widest uppercase appearance-none text-center"
                  >
                    <option value="auto">Auto</option>
                    <option value="top">Top</option>
                    <option value="jungle">Jungle</option>
                    <option value="mid">Mid</option>
                    <option value="adc">ADC</option>
                    <option value="support">Support</option>
                  </select>
                )}

                <button
                  onClick={() => setShowOptSettings(true)}
                  className="bg-black/80 text-white/70 hover:text-white border-l border-white/5 px-3 outline-none text-[9px] cursor-pointer flex items-center justify-center transition-colors font-bold tracking-widest"
                  title="AI Optimization Settings"
                >
                  ⚙️ AI配置
                </button>

                <button
                  onClick={optimizeBuild}
                  disabled={isOptimizing}
                  title="Auto-Optimize Build for Current Combo"
                  className="px-3 hover:bg-yellow-500/20 text-yellow-500 border-l border-white/5 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isOptimizing ? '⏳ 计算中...' : '✨ 一键优化'}
                </button>
             </div>
             <div className="p-3">
               <BuildPanel 
                 title={`出装方案 ${activeBuildIndex + 1}`} 
                 build={attackerBuild} 
                 stats={attackerStats} 
                 colorClass="border-[#00F2FF]/30" 
                 textColor="text-[#00F2FF]"
                 items={ITEMS}
                 onDrop={(e: any, i: number) => handleDrop(e, 'Attacker', i)}
                 onRemove={(i: number) => { 
                   const n = [...attackerBuilds]; 
                   const active = [...n[activeBuildIndex]];
                   active[i] = null;
                   n[activeBuildIndex] = active;
                   setAttackerBuilds(n); 
                 }}
               />
               
               {optimizationLog && (
                 <div className="mt-3 p-2 rounded bg-black/40 border border-[#00F2FF]/20 text-[10px] text-gray-300 font-mono flex flex-col gap-1 shadow-inner relative overflow-hidden">
                    {isOptimizing && (
                      <div className="absolute inset-0 bg-[#00F2FF]/5 animate-pulse pointer-events-none" />
                    )}
                    <div className="flex justify-between text-[#00F2FF] font-bold border-b border-white/5 pb-1 mb-1">
                       <span><span className="text-white/60 font-sans tracking-wide">目标:</span> {(optimizationLog.method || '').toUpperCase()} <span className="text-white/40 ml-2">[{optimizationLog.algo}]</span></span>
                       <span className="text-yellow-500">
                          {isOptimizing ? <span className="text-white/80 animate-pulse">{optimizationLog.statusDesc}</span> : `${optimizationLog.timeMs}ms`} 
                          {!isOptimizing && <span className="text-white/50 mx-1">|</span>} 
                          {!isOptimizing && `${optimizationLog.explored?.toLocaleString()} 次评估`}
                       </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-white/50">
                       <span>技能伤害协同类型:</span>
                       <span className={cn("px-1.5 py-0.5 rounded font-bold text-black transition-colors", optimizationLog.isComboAP ? "bg-purple-400" : optimizationLog.isComboAD ? "bg-orange-400" : "bg-gray-400")}>
                          {optimizationLog.isComboAP ? '魔法主导 (AP)' : optimizationLog.isComboAD ? '物理主导 (AD)' : '混伤 / 机制 (Mixed)'}
                       </span>
                    </div>
                    <div className="flex gap-3 pt-1 border-t border-white/5 mt-1 border-dashed">
                       <div><span className="text-white/30">ADΔ:</span> <span className="text-orange-400">{optimizationLog.wAD?.toFixed(2)}</span></div>
                       <div><span className="text-white/30">APΔ:</span> <span className="text-purple-400">{optimizationLog.wAP?.toFixed(2)}</span></div>
                       <div><span className="text-white/30">HPΔ:</span> <span className="text-green-400">{optimizationLog.wHP?.toFixed(3)}</span></div>
                       <div><span className="text-white/30">ARMΔ:</span> <span className="text-yellow-600">{optimizationLog.wArmor?.toFixed(2)}</span></div>
                    </div>
                    {optimizationLog.opggLog && (
                       <div className="pt-1 mt-1 border-t border-white/5 border-dashed">
                          <span className={cn("text-[9px]", optimizationLog.opggLog.includes('✖') ? "text-yellow-500/80" : "text-[#5383E8]")}>{optimizationLog.opggLog}</span>
                       </div>
                    )}
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Center: DPS Result & Store combined */}
        <div className="xl:col-span-6 flex flex-col gap-4">
          <div className="glass-card p-6 flex flex-col items-center justify-center border-y-2 border-[#c8aa6e] bg-gradient-to-b from-[#1c2128] to-[#0e1117]/80 shrink-0">
             <div className="text-[#c8aa6e] mb-2 uppercase text-[11px] font-bold tracking-[0.2em] relative z-10">操作模拟</div>
             
             <div className="text-5xl font-mono text-white font-bold tracking-tight my-2 flex items-baseline gap-2 relative z-10">
               {Math.round(mitigatedDps)}
               <span className="text-[14px] text-text-secondary font-sans tracking-normal opacity-70">DPS</span>
             </div>
             
             <div className="flex items-center gap-6 text-xs text-text-secondary font-mono relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F2FF]"></span>
                  AD: {Math.round(attackerStats?.ad || 0)}
                </div>
                <div className="h-4 w-[1px] bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-danger"></span>
                  Armor: {Math.round(defenderStats?.armor || 0)}
                </div>
             </div>
          </div>

          {/* Shop & Stats Tabs */}
          <div className="flex-1 glass-card flex flex-col overflow-hidden">
             <div className="flex border-b border-white/5 text-[11px] font-bold tracking-wider uppercase shrink-0">
                <button 
                  onClick={() => setCenterTab('shop')} 
                  className={cn("flex-1 py-3 transition-colors", centerTab === 'shop' ? "text-[#c8aa6e] bg-[#c8aa6e]/10 border-b-2 border-[#c8aa6e]" : "text-text-secondary hover:bg-white/5")}
                >
                  装备商店
                </button>
                <button 
                  onClick={() => setCenterTab('stats')} 
                  className={cn("flex-1 py-3 transition-colors", centerTab === 'stats' ? "text-[#00F2FF] bg-[#00F2FF]/10 border-b-2 border-[#00F2FF]" : "text-text-secondary hover:bg-white/5")}
                >
                  属性雷达分析
                </button>
                <button 
                  onClick={() => setCenterTab('combo')} 
                  className={cn("flex-1 py-3 transition-colors", centerTab === 'combo' ? "text-[#e74c3c] bg-[#e74c3c]/10 border-b-2 border-[#e74c3c]" : "text-text-secondary hover:bg-white/5")}
                >
                  连招伤害结算面板
                </button>
                <button 
                  onClick={() => setCenterTab('builder')} 
                  className={cn("flex-1 py-3 transition-colors flex items-center justify-center gap-1.5", centerTab === 'builder' ? "text-white bg-[#5383E8] border-b-2 border-[#5383E8]" : "text-text-secondary hover:bg-white/5")}
                >
                  <span className={cn("px-1 py-0.5 rounded-sm text-[9px] font-black italic tracking-tighter leading-none h-[14px]", centerTab === 'builder' ? "bg-white text-[#5383E8]" : "bg-gray-700 text-gray-400")}>OP.GG</span>
                  智能推荐
                </button>
                <button 
                  onClick={() => setCenterTab('meta')} 
                  className={cn("flex-1 py-3 transition-colors", centerTab === 'meta' ? "text-[#a855f7] bg-[#a855f7]/10 border-b-2 border-[#a855f7]" : "text-text-secondary hover:bg-white/5")}
                >
                  装备版本大数据
                </button>
             </div>
             
             <div className="flex-1 min-h-0 relative p-4">
               {centerTab === 'shop' && (
                 <ItemSelector 
                   items={ITEMS} 
                   onSelect={(item) => {
                     const aIdx = attackerBuild.indexOf(null);
                     if (aIdx !== -1) {
                       const n = [...attackerBuilds]; 
                       const active = [...n[activeBuildIndex]];
                       active[aIdx] = item.id;
                       n[activeBuildIndex] = active;
                       setAttackerBuilds(n); 
                       return;
                     }
                     const bIdx = defenderBuild.indexOf(null);
                     if (bIdx !== -1) {
                       const n = [...defenderBuild]; n[bIdx] = item.id; setDefenderBuild(n); return;
                     }
                   }} 
                 />
               )}
               {centerTab === 'stats' && (
                 <div className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <div>
                      <h2 className="font-sans font-semibold text-[13px] text-text-secondary uppercase tracking-wider mb-4 border-b border-white/10 pb-2">数据可视化对比</h2>
                      
                      <div className="flex flex-col xl:flex-row gap-6 mb-6">
                        <div className="flex-1 min-h-[250px] relative mt-4">
                           <ResponsiveContainer width="100%" height="100%">
                              <RadarChart 
                                outerRadius="70%" 
                                data={[
                                  { subject: 'HP', B1: Math.min(attackerStatsAll[0]?.hp || 0, 4000) / 4000 * 100, B2: Math.min(attackerStatsAll[1]?.hp || 0, 4000) / 4000 * 100, B3: Math.min(attackerStatsAll[2]?.hp || 0, 4000) / 4000 * 100, Target: Math.min(defenderStats?.hp || 0, 4000) / 4000 * 100 },
                                  { subject: 'AD', B1: Math.min(attackerStatsAll[0]?.ad || 0, 400) / 400 * 100, B2: Math.min(attackerStatsAll[1]?.ad || 0, 400) / 400 * 100, B3: Math.min(attackerStatsAll[2]?.ad || 0, 400) / 400 * 100, Target: Math.min(defenderStats?.ad || 0, 400) / 400 * 100 },
                                  { subject: 'AP', B1: Math.min(attackerStatsAll[0]?.ap || 0, 800) / 800 * 100, B2: Math.min(attackerStatsAll[1]?.ap || 0, 800) / 800 * 100, B3: Math.min(attackerStatsAll[2]?.ap || 0, 800) / 800 * 100, Target: Math.min(defenderStats?.ap || 0, 800) / 800 * 100 },
                                  { subject: 'Armor', B1: Math.min(attackerStatsAll[0]?.armor || 0, 250) / 250 * 100, B2: Math.min(attackerStatsAll[1]?.armor || 0, 250) / 250 * 100, B3: Math.min(attackerStatsAll[2]?.armor || 0, 250) / 250 * 100, Target: Math.min(defenderStats?.armor || 0, 250) / 250 * 100 },
                                  { subject: 'MR', B1: Math.min(attackerStatsAll[0]?.mr || 0, 250) / 250 * 100, B2: Math.min(attackerStatsAll[1]?.mr || 0, 250) / 250 * 100, B3: Math.min(attackerStatsAll[2]?.mr || 0, 250) / 250 * 100, Target: Math.min(defenderStats?.mr || 0, 250) / 250 * 100 },
                                  { subject: 'AS', B1: Math.min(attackerStatsAll[0]?.as || 0, 2.5) / 2.5 * 100, B2: Math.min(attackerStatsAll[1]?.as || 0, 2.5) / 2.5 * 100, B3: Math.min(attackerStatsAll[2]?.as || 0, 2.5) / 2.5 * 100, Target: Math.min(defenderStats?.as || 0, 2.5) / 2.5 * 100 },
                                ]}
                              >
                                <PolarGrid stroke="#ffffff20" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8B949E', fontSize: 10 }} />
                                <Radar name="Build 1" dataKey="B1" stroke="#00F2FF" fill="#00F2FF" fillOpacity={0.2} />
                                <Radar name="Build 2" dataKey="B2" stroke="#4ade80" fill="#4ade80" fillOpacity={0.2} />
                                <Radar name="Build 3" dataKey="B3" stroke="#facc15" fill="#facc15" fillOpacity={0.2} />
                                <Radar name="Target" dataKey="Target" stroke="#E74C3C" fill="#E74C3C" fillOpacity={0.1} />
                                <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                                <RechartsTooltip 
                                  contentStyle={{ backgroundColor: '#0e1117', borderColor: '#ffffff20', fontSize: '11px' }}
                                  formatter={(val: number) => [`${Math.round(val)}% (Normalized)`, '']}
                                />
                              </RadarChart>
                           </ResponsiveContainer>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-5 gap-x-2 gap-y-1 text-[12px] min-w-[280px]">
                          <div className="text-text-secondary font-medium uppercase tracking-wider opacity-60 flex items-center justify-center">属性</div>
                          <div className="text-danger font-mono text-center pb-1 border-b border-danger/20" title="Target Stats">目标</div>
                          <div className="text-[#00F2FF] font-mono text-center pb-1 border-b border-[#00F2FF]/20" title="Build 1">方案 1</div>
                          <div className="text-[#00F2FF] font-mono text-center pb-1 border-b border-[#00F2FF]/20" title="Build 2">方案 2</div>
                          <div className="text-[#00F2FF] font-mono text-center pb-1 border-b border-[#00F2FF]/20" title="Build 3">方案 3</div>
                          
                          <StatRow5 label="HP" valT={defenderStats?.hp} val1={attackerStatsAll[0]?.hp} val2={attackerStatsAll[1]?.hp} val3={attackerStatsAll[2]?.hp} />
                          <StatRow5 label="AD" valT={defenderStats?.ad} val1={attackerStatsAll[0]?.ad} val2={attackerStatsAll[1]?.ad} val3={attackerStatsAll[2]?.ad} />
                          <StatRow5 label="AP" valT={defenderStats?.ap} val1={attackerStatsAll[0]?.ap} val2={attackerStatsAll[1]?.ap} val3={attackerStatsAll[2]?.ap} />
                          <StatRow5 label="Armor" valT={defenderStats?.armor} val1={attackerStatsAll[0]?.armor} val2={attackerStatsAll[1]?.armor} val3={attackerStatsAll[2]?.armor} />
                          <StatRow5 label="MR" valT={defenderStats?.mr} val1={attackerStatsAll[0]?.mr} val2={attackerStatsAll[1]?.mr} val3={attackerStatsAll[2]?.mr} />
                          <StatRow5 label="AS" valT={defenderStats?.as} val1={attackerStatsAll[0]?.as} val2={attackerStatsAll[1]?.as} val3={attackerStatsAll[2]?.as} isFixed />
                          <StatRow5 label="Crit" valT={defenderStats?.crit} val1={attackerStatsAll[0]?.crit} val2={attackerStatsAll[1]?.crit} val3={attackerStatsAll[2]?.crit} isPercent />
                          <StatRow5 label="Ab.Haste" valT={defenderStats?.abilityHaste} val1={attackerStatsAll[0]?.abilityHaste} val2={attackerStatsAll[1]?.abilityHaste} val3={attackerStatsAll[2]?.abilityHaste} />
                          <StatRow5 label="Leth/Pen" valT={`${defenderStats?.lethality || 0} | ${defenderStats?.armorPenPct || 0}%`} val1={`${attackerStatsAll[0]?.lethality || 0} | ${attackerStatsAll[0]?.armorPenPct || 0}%`} val2={`${attackerStatsAll[1]?.lethality || 0} | ${attackerStatsAll[1]?.armorPenPct || 0}%`} val3={`${attackerStatsAll[2]?.lethality || 0} | ${attackerStatsAll[2]?.armorPenPct || 0}%`} />
                          <StatRow5 label="Mag.Pen" valT={`${defenderStats?.magicPenFlat || 0} | ${defenderStats?.magicPenPct || 0}%`} val1={`${attackerStatsAll[0]?.magicPenFlat || 0} | ${attackerStatsAll[0]?.magicPenPct || 0}%`} val2={`${attackerStatsAll[1]?.magicPenFlat || 0} | ${attackerStatsAll[1]?.magicPenPct || 0}%`} val3={`${attackerStatsAll[2]?.magicPenFlat || 0} | ${attackerStatsAll[2]?.magicPenPct || 0}%`} />
                          <StatRow5 label="Raw DPS" valT={defenderStats?.rawDps} val1={attackerStatsAll[0]?.rawDps} val2={attackerStatsAll[1]?.rawDps} val3={attackerStatsAll[2]?.rawDps} />
                        </div>
                      </div>
                    </div>
                 </div>
               )}
               {centerTab === 'builder' && (
                 <div className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {/* OP.GG Champion Analytics Dashboard */}
                    <div className="flex flex-col gap-1 pr-2">
                       <div className="flex items-center gap-2 mb-2 p-1">
                           <div className="bg-[#5383E8] text-white font-black italic px-2 py-0.5 rounded-sm text-sm tracking-tighter">OP.GG</div>
                           <h2 className="font-sans font-semibold text-[13px] text-white tracking-wider truncate">全球数据全景分析</h2>
                           <div className="flex items-center gap-1.5 ml-auto">
                               {opggMode === 'ranked' && (
                                   <select 
                                      value={opggPosition} 
                                      onChange={(e) => setOpggPosition(e.target.value)} 
                                      className="bg-[#ffffff05] text-[#b2b2b2] border border-[#ffffff10] rounded px-2 py-0.5 text-[11px] font-bold uppercase outline-none mr-2"
                                   >
                                      <option value="auto">Auto</option>
                                      <option value="top">Top</option>
                                      <option value="jungle">Jungle</option>
                                      <option value="mid">Mid</option>
                                      <option value="adc">ADC</option>
                                      <option value="support">Support</option>
                                   </select>
                               )}
                               {['ranked', 'aram', 'arena'].map(m => (
                                  <button key={m} onClick={() => setOpggMode(m as any)} className={cn("px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-colors tracking-widest", opggMode === m ? "bg-[#5383E8] text-white" : "bg-[#ffffff05] text-[#b2b2b2] hover:bg-[#ffffff0a] border border-[#ffffff10]")}>
                                     {m}
                                  </button>
                               ))}
                           </div>
                       </div>
                       
                       {isOpggLoading ? (
                          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-[#5383E8] border-t-transparent rounded-full animate-spin"></div></div>
                       ) : opggAnalytics ? (
                          <div className="flex flex-col gap-3 overflow-x-hidden p-1">
                             {/* Header Card */}
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05] shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#5383E8]/10 blur-[40px] rounded-full group-hover:bg-[#5383E8]/20 transition-all pointer-events-none"></div>
                                <div className="flex items-center gap-3 relative z-10">
                                   <div className="relative">
                                      <img 
                                          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${attackerChamp.id}.png`} 
                                          className="w-[78px] h-[78px] rounded-full ring-2 ring-[#5383E8]/50 shadow-[0_0_10px_rgba(83,131,232,0.3)]" 
                                      />
                                      <div className={cn("absolute -bottom-2 lg:-bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider backdrop-blur-sm", 
                                           opggAnalytics.tier === "1" ? "border-[#0093ff]/50 bg-[#0093ff]/20 text-[#0093ff]" :
                                           opggAnalytics.tier === "2" ? "border-[#00bba3]/50 bg-[#00bba3]/20 text-[#00bba3]" :
                                           opggAnalytics.tier === "3" ? "border-[#ffb900]/50 bg-[#ffb900]/20 text-[#ffb900]" :
                                           opggAnalytics.tier === "4" ? "border-[#9aa4af]/50 bg-[#9aa4af]/20 text-[#9aa4af]" :
                                           opggAnalytics.tier === "5" ? "border-[#a88a67]/50 bg-[#a88a67]/20 text-[#a88a67]" :
                                           "border-[#ff7300]/50 bg-[#ff7300]/20 text-[#ff7300]"
                                       )}>
                                           Tier {opggAnalytics.tier}
                                      </div>
                                   </div>
                                   <div className="flex flex-col mr-auto">
                                       <div className="text-[20px] font-bold text-white drop-shadow-md tracking-wide">{attackerChamp.name}</div>
                                       <div className="text-[12px] text-[#5383E8] uppercase font-mono tracking-widest mt-0.5 font-semibold">
                                           {attackerChamp?.tags?.includes('Marksman') ? 'Bot Lane' : 'Mid Lane'}
                                       </div>
                                   </div>
                                   <div className="flex gap-4">
                                       <div className="flex flex-col items-center justify-center">
                                           <div className="text-[10px] text-[#b2b2b2] uppercase tracking-wider font-bold mb-0.5">Win Rate</div>
                                           <div className={cn("text-[14px] font-black", opggAnalytics.winRate >= 50 ? "text-[#a0c6f8]" : "text-[#d75a5a]")}>{opggAnalytics.winRate}%</div>
                                       </div>
                                       <div className="w-px h-8 bg-white/10 self-center"></div>
                                       <div className="flex flex-col items-center justify-center">
                                           <div className="text-[10px] text-[#b2b2b2] uppercase tracking-wider font-bold mb-0.5">Pick Rate</div>
                                           <div className="text-[14px] font-black text-white">{opggAnalytics.pickRate}%</div>
                                       </div>
                                       <div className="w-px h-8 bg-white/10 self-center"></div>
                                       <div className="flex flex-col items-center justify-center">
                                           <div className="text-[10px] text-[#b2b2b2] uppercase tracking-wider font-bold mb-0.5">KDA</div>
                                           <div className="text-[14px] font-black text-emerald-400">{opggAnalytics.kda || '0.00'}</div>
                                       </div>
                                   </div>
                                </div>
                             </div>

                             {/* Trends row: Patch over Patch & Game Length */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                 {/* Patch Trends */}
                                 {opggAnalytics.trends?.win && opggAnalytics.trends.win.length > 0 && (
                                    <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                        <div className="flex justify-between items-center text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                            Patch Trends
                                        </div>
                                        <div className="h-[120px] w-full mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {(() => {
                                                    const combinedTrends = [...opggAnalytics.trends.win].reverse().map(w => {
                                                        const p = opggAnalytics.trends.pick?.find((x: any) => x.version === w.version);
                                                        return { version: w.version, win: w.rate, pick: p?.rate || 0 };
                                                    });
                                                    return (
                                                        <ComposedChart data={combinedTrends}>
                                                            <XAxis dataKey="version" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                                                            <YAxis yAxisId="win" domain={['dataMin - 0.01', 'dataMax + 0.01']} hide />
                                                            <YAxis yAxisId="pick" orientation="right" hide />
                                                            <RechartsTooltip 
                                                                contentStyle={{ backgroundColor: '#1c2128', border: '1px solid #37373c', borderRadius: '4px', fontSize: '11px' }}
                                                                itemStyle={{ fontWeight: 'bold' }}
                                                                labelStyle={{ color: '#b2b2b2', marginBottom: '2px' }}
                                                                formatter={(val: number, name: string) => [`${(val * 100).toFixed(2)}%`, name === 'win' ? 'Win Rate' : 'Pick Rate']}
                                                            />
                                                            <Bar yAxisId="pick" dataKey="pick" fill="#5383E8" opacity={0.2} radius={[2, 2, 0, 0]} />
                                                            <Line yAxisId="win" type="monotone" dataKey="win" stroke="#00d7b0" strokeWidth={2} dot={{ r: 2, fill: '#1c2128', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: '#00d7b0' }} />
                                                        </ComposedChart>
                                                    );
                                                })()}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                 )}

                                 {/* Win Rate by Game Length */}
                                 {opggAnalytics.gameLengths && opggAnalytics.gameLengths.length > 0 && (
                                    <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                        <div className="flex justify-between items-center text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                            Win Rate / Game Length
                                        </div>
                                        <div className="h-[120px] w-full mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={opggAnalytics.gameLengths}>
                                                    <XAxis dataKey="game_length" stroke="#555" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? '0-25' : `${val}m`} />
                                                    <YAxis domain={['dataMin - 0.01', 'dataMax + 0.01']} hide />
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: '#1c2128', border: '1px solid #37373c', borderRadius: '4px', fontSize: '11px' }}
                                                        itemStyle={{ color: '#5383E8', fontWeight: 'bold' }}
                                                        labelStyle={{ color: '#b2b2b2', marginBottom: '2px' }}
                                                        formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, 'Win Rate']}
                                                        labelFormatter={(label) => label === 0 ? '0-25m' : `${label}-${label+5}m`}
                                                    />
                                                    <Line type="monotone" dataKey="rate" stroke="#5383E8" strokeWidth={2} dot={{ r: 3, fill: '#1c2128', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#5383E8' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                 )}
                             </div>

                             {/* Spells & Starters Row */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                 {/* Summoner Spells */}
                                 {opggAnalytics.summonerSpells?.length > 0 && (
                                     <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                         <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">Summoner Spells</div>
                                         <div className="flex flex-col gap-2">
                                             {opggAnalytics.summonerSpells.slice(0, 4).map((ss: any, idx: number) => (
                                                 <div key={idx} className="flex justify-between items-center bg-[#ffffff05] p-2 rounded hover:bg-[#ffffff0a] transition-colors">
                                                     <div className="flex gap-1.5">
                                                         {ss.spells.map((id: string, j: number) => (
                                                             <img key={j} src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/Summoner${id === '4' ? 'Flash' : id === '14' ? 'Dot' : id === '12' ? 'Teleport' : id === '3' ? 'Exhaust' : id === '6' ? 'Haste' : id === '7' ? 'Heal' : id === '11' ? 'Smite' : id === '21' ? 'Barrier' : id === '1' ? 'Boost' : 'DarkValkyrie'}.png`} className="w-[28px] h-[28px] rounded border border-white/10" onError={(e:any)=>{e.target.src='https://ddragon.leagueoflegends.com/cdn/14.11.1/img/spell/SummonerFlash.png'}} />
                                                         ))}
                                                     </div>
                                                     <div className="text-right">
                                                         <div className="text-[12px] font-bold text-[#a0c6f8]">{ss.winRate}%</div>
                                                         <div className="text-[10px] text-[#b2b2b2]">{ss.pickRate}% PR</div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* Starter Items */}
                                 {opggAnalytics.starterItems?.length > 0 && (
                                     <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                         <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">Starter Items</div>
                                         <div className="flex flex-col gap-2">
                                             {opggAnalytics.starterItems.slice(0, 4).map((si: any, idx: number) => (
                                                 <div key={idx} className="flex justify-between items-center bg-[#ffffff05] p-2 rounded hover:bg-[#ffffff0a] transition-colors">
                                                     <div className="flex gap-1">
                                                         {si.items.map((id: string, j: number) => (
                                                             <SafeItemTooltip key={j} itemId={id}>
                                                                 <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`} className="w-[28px] h-[28px] rounded-[4px] border border-white/10 shadow-sm hover:scale-110 transition-transform" />
                                                             </SafeItemTooltip>
                                                         ))}
                                                     </div>
                                                     <div className="text-right flex flex-col justify-center">
                                                         <div className="text-[12px] font-bold text-[#a0c6f8] leading-none mb-1">{si.winRate}%</div>
                                                         <div className="text-[10px] text-[#b2b2b2] leading-none">{si.pickRate}% PR</div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>

                             {/* Counters Card */}
                             {(opggAnalytics.counters?.weakAgainst?.length > 0 || opggAnalytics.counters?.strongAgainst?.length > 0) && (
                             <div className="flex flex-col gap-2">
                                 {opggAnalytics.counters.weakAgainst.length > 0 && (
                                 <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                     <div className="text-[12px] font-bold mb-3 text-[#d75a5a] uppercase tracking-widest">
                                         Weak Against
                                     </div>
                                     <div className="flex flex-wrap gap-2.5">
                                         {opggAnalytics.counters.weakAgainst
                                           .sort((a: any, b: any) => a.winRate - b.winRate)
                                           .slice(0, 16)
                                           .map((c: any, i: number) => {
                                             const champ = CHAMPIONS.find((ch: any) => ch.key === String(c.championId) || ch.id.toLowerCase() === String(c.championId).toLowerCase());
                                             if (!champ) return null;
                                             return (
                                                 <div key={i} onClick={() => setAttackerChampId(champ.id)} className="flex flex-col items-center w-[46px] cursor-pointer hover:scale-105 transition-all group">
                                                     <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`} className="w-[40px] h-[40px] mb-1.5 rounded-[6px] shadow-sm ring-1 ring-[#d75a5a]/30 group-hover:ring-2 group-hover:ring-[#d75a5a]/70" title={champ.name} />
                                                     <div className="text-[11px] font-black text-[#d75a5a]">
                                                         {c.winRate.toFixed(1)}%
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                                 )}
                                 {opggAnalytics.counters.strongAgainst.length > 0 && (
                                 <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                     <div className="text-[12px] font-bold mb-3 text-[#a0c6f8] uppercase tracking-widest">
                                         Strong Against
                                     </div>
                                     <div className="flex flex-wrap gap-2.5">
                                         {opggAnalytics.counters.strongAgainst
                                           .sort((a: any, b: any) => b.winRate - a.winRate)
                                           .slice(0, 16)
                                           .map((c: any, i: number) => {
                                             const champ = CHAMPIONS.find((ch: any) => ch.key === String(c.championId) || ch.id.toLowerCase() === String(c.championId).toLowerCase());
                                             if (!champ) return null;
                                             return (
                                                 <div key={i} onClick={() => setAttackerChampId(champ.id)} className="flex flex-col items-center w-[46px] cursor-pointer hover:scale-105 transition-all group">
                                                     <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`} className="w-[40px] h-[40px] mb-1.5 rounded-[6px] shadow-sm ring-1 ring-[#a0c6f8]/30 group-hover:ring-2 group-hover:ring-[#a0c6f8]/70" title={champ.name} />
                                                     <div className="text-[11px] font-black text-[#a0c6f8]">
                                                         {c.winRate.toFixed(1)}%
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                                 )}
                             </div>
                             )}

                             {/* Runes Card */}
                             {opggAnalytics.runes?.[0] && (
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                 <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                     Runes
                                 </div>
                                 <div className="flex flex-col gap-2">
                                     {opggAnalytics.runes?.slice(0, 2).map((rune: any, idx: number) => (
                                         <div key={idx} className="flex items-center gap-2 bg-[#ffffff05] p-3 rounded hover:bg-[#ffffff0a] transition-colors border border-white/5">
                                             <div className="flex flex-col items-center min-w-[20px] text-[12px] font-black text-[#5383E8]">#{idx + 1}</div>
                                             <div className="flex-1 ml-1">
                                                 <div className="flex items-end gap-1.5 mb-2 relative">
                                                     <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${rune.primaryTree === '8100' ? '7200_Domination' : rune.primaryTree === '8000' ? '7201_Precision' : rune.primaryTree === '8200' ? '7202_Sorcery' : rune.primaryTree === '8300' ? '7203_Whimsy' : '7204_Resolve'}.png`} className="w-[28px] h-[28px] mr-1" />
                                                     {rune.perks?.slice(0, 4).map((p: string, i: number) => (
                                                         <div key={i} className="w-[24px] h-[24px] rounded-full ring-1 ring-white/20 bg-black/50 flex flex-col items-center justify-center overflow-hidden" title={p}><span className="text-[8px] font-bold text-white/50">{p.substring(0,1)}</span></div>
                                                     ))}
                                                 </div>
                                                 <div className="flex items-end gap-1.5 relative">
                                                     <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${rune.secondaryTree === '8100' ? '7200_Domination' : rune.secondaryTree === '8000' ? '7201_Precision' : rune.secondaryTree === '8200' ? '7202_Sorcery' : rune.secondaryTree === '8300' ? '7203_Whimsy' : '7204_Resolve'}.png`} className="w-[28px] h-[28px] mr-1 opacity-80" />
                                                     {rune.perks?.slice(4, 6).map((p: string, i: number) => (
                                                         <div key={i} className="w-[24px] h-[24px] rounded-full ring-1 ring-white/20 bg-black/50 flex flex-col items-center justify-center overflow-hidden" title={p}><span className="text-[8px] font-bold text-white/50">{p.substring(0,1)}</span></div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <div className="flex items-center ml-auto">
                                                 <div className="flex flex-col items-center min-w-[76px]">
                                                     <span className="text-[14px] text-white font-black">{rune.pickRate}%</span>
                                                     <span className="text-[10px] text-[#5383E8] text-center font-bold tracking-widest mt-0.5 uppercase">Pick</span>
                                                 </div>
                                                 <div className="w-px h-8 bg-white/10 mx-2"></div>
                                                 <div className="flex flex-col items-center min-w-[76px]">
                                                     <span className="text-[14px] text-emerald-400 font-black">{rune.winRate}%</span>
                                                     <span className="text-[10px] text-[#5383E8] text-center font-bold tracking-widest mt-0.5 uppercase">Win</span>
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             )}

                             {/* Skill Order Card */}
                             {opggAnalytics.skillOrder?.length > 0 && (
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                 <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                     Ability Build
                                 </div>
                                 {opggAnalytics.skillOrder.slice(0, 3).map((so: any, i: number) => (
                                 <div key={i} className="flex items-center min-h-[56px] bg-[#ffffff05] p-3 rounded hover:bg-[#ffffff0a] transition-colors border border-white/5 mb-2 last:mb-0">
                                     <div className="min-w-[20px] text-[12px] font-black text-[#5383E8] mr-2">#{i + 1}</div>
                                     <div className="ml-1 flex-1">
                                         <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                             {so.order.slice(0, 5).map((s: string, j: number) => (
                                                 <React.Fragment key={j}>
                                                     <div className={cn("w-7 h-7 flex items-center justify-center rounded-[6px] text-white font-black text-sm shadow-sm", s==='Q' ? "bg-gradient-to-br from-[#01a8fb] to-[#0178b5]" : s==='W' ? "bg-gradient-to-br from-[#00d7b0] to-[#009e82]" : s==='E' ? "bg-gradient-to-br from-[#ff8200] to-[#cc6800]" : "bg-gradient-to-br from-[#5f32e6] to-[#4623ab]")}>{s}</div>
                                                     {j < 4 && <span className="text-[10px] text-[#555] font-black mx-0.5">{'>'}</span>}
                                                 </React.Fragment>
                                             ))}
                                         </div>
                                         <div className="flex flex-wrap items-center gap-[2px]">
                                             {so.order.map((s: string, j: number) => (
                                                 <div key={j} className={cn("w-5 h-5 flex items-center justify-center rounded-[4px] text-white font-bold text-[9px]", s==='Q' ? "bg-[#01a8fb]" : s==='W' ? "bg-[#00d7b0]" : s==='E' ? "bg-[#ff8200]" : "bg-[#5f32e6]")}>{s}</div>
                                             ))}
                                         </div>
                                     </div>
                                     <div className="flex items-center ml-auto">
                                         <div className="flex flex-col items-center min-w-[76px]">
                                             <span className="text-[14px] text-white font-black">{so.pickRate}%</span>
                                             <span className="text-[10px] text-[#5383E8] text-center font-bold tracking-widest mt-0.5 uppercase">Pick</span>
                                         </div>
                                         <div className="w-px h-8 bg-white/10 mx-2"></div>
                                         <div className="flex flex-col items-center min-w-[76px]">
                                             <span className="text-[14px] text-emerald-400 font-black">{so.winRate}%</span>
                                             <span className="text-[10px] text-[#5383E8] text-center font-bold tracking-widest mt-0.5 uppercase">Win</span>
                                         </div>
                                     </div>
                                 </div>
                                 ))}
                             </div>
                             )}

                             {/* Boots Card */}
                             {opggAnalytics.boots?.length > 0 && (
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                 <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                     Boots
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                                     {opggAnalytics.boots.slice(0, 8).map((boot: any, i: number) => (
                                         <div key={i} className="flex items-center gap-3 p-1.5 rounded hover:bg-[#ffffff0a] transition-colors group">
                                             <div className="min-w-[16px] text-[10px] font-black text-[#5383E8]">#{i + 1}</div>
                                             <SafeItemTooltip itemId={boot.id}>
                                                 <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${boot.id}.png`} className="w-[32px] h-[32px] rounded-[6px] shadow-sm transform group-hover:scale-110 transition-transform" />
                                             </SafeItemTooltip>
                                             <div className="flex flex-col ml-auto text-right">
                                                 <span className="text-[14px] text-emerald-400 font-black leading-tight">{boot.winRate}%</span>
                                                 <span className="text-[10px] text-[#b2b2b2] leading-tight">{boot.pickRate}% PR</span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             )}

                             {/* Augments Card (Arena Only) */}
                             {opggAnalytics.augments?.length > 0 && opggMode === 'arena' && (
                                 <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                     <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                         海克斯强化 (Augments)
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                         {opggAnalytics.augments.map((group: any, gi: number) => (
                                             <div key={gi} className="flex flex-col gap-2">
                                                 <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: group.rarity === 3 ? '#00ffff' : group.rarity === 2 ? '#ffd700' : '#c0c0c0' }}>
                                                     {group.rarity === 3 ? '棱彩 (Prismatic)' : group.rarity === 2 ? '黄金 (Gold)' : '白银 (Silver)'}
                                                 </div>
                                                 <div className="flex flex-col gap-1.5">
                                                     {group.augments.slice(0, 5).map((ag: any, ai: number) => (
                                                         <div key={ai} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#ffffff0a] transition-colors border border-white/5 bg-[#00000018]" title={ag.name}>
                                                             <div className="w-[28px] h-[28px] rounded-[6px] shrink-0 flex items-center justify-center font-black text-[10px] bg-black/40 border relative overflow-hidden" style={{ borderColor: group.rarity === 3 ? '#00ffff3d' : group.rarity === 2 ? '#ffd7003d' : '#c0c0c03d', color: group.rarity === 3 ? '#00ffff' : group.rarity === 2 ? '#ffd700' : '#c0c0c0' }}>
                                                                 {ag.iconUrl ? (
                                                                     <img src={ag.iconUrl} className="absolute inset-0 w-full h-full object-cover" onError={(e:any)=>{e.target.style.display='none'}} />
                                                                 ) : (
                                                                     <span className="relative z-10 drop-shadow-md">#{ag.id}</span>
                                                                 )}
                                                             </div>
                                                             <div className="flex flex-col flex-1 pl-1 min-w-0">
                                                                 <div className="flex justify-between items-center leading-none mb-1">
                                                                     <span className="text-[10px] text-white font-bold truncate pr-1" title={ag.name}>{ag.name}</span>
                                                                     <span className="text-[12px] text-emerald-400 font-black shrink-0">{ag.winRate}% <span className="text-[9px] text-[#5383E8] uppercase ml-0.5">Win</span></span>
                                                                 </div>
                                                                 <div className="flex justify-between items-end leading-none">
                                                                     <span className="text-[11px] text-[#b2b2b2] font-bold">{ag.pickRate}% <span className="text-[9px] text-[#5383E8] uppercase ml-0.5">Pick</span></span>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}

                             {/* Core Items Card */}
                             {opggAnalytics.coreBuilds?.length > 0 && (
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                 <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                     核心三件套 (Core Items)
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                     {opggAnalytics.coreBuilds.slice(0, 10).map((build: any, i: number) => (
                                     <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-[#ffffff0a] transition-colors border border-transparent hover:border-white/5 group bg-[#00000020]">
                                         <div className="min-w-[20px] text-[12px] font-black text-[#5383E8]">#{i + 1}</div>
                                         <div className="flex gap-1 items-center">
                                             {build.items.map((itemId: string, j: number) => (
                                                 <React.Fragment key={j}>
                                                     <SafeItemTooltip itemId={itemId}>
                                                         <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`} className="w-[32px] h-[32px] rounded-[6px] shadow-sm group-hover:scale-105 transition-transform" />
                                                     </SafeItemTooltip>
                                                     {j < build.items.length - 1 && <span className="text-[10px] text-[#555] font-black mx-0.5">{'>'}</span>}
                                                 </React.Fragment>
                                             ))}
                                         </div>
                                         <div className="flex items-center ml-auto gap-4">
                                             <div className="flex flex-col items-center">
                                                 <span className="text-[14px] text-white font-black">{build.pickRate}%</span>
                                                 <span className="text-[9px] text-[#5383E8] tracking-widest uppercase mt-0.5">选取率</span>
                                             </div>
                                             <div className="flex flex-col items-center">
                                                 <span className="text-[14px] text-emerald-400 font-black">{build.winRate}%</span>
                                                 <span className="text-[9px] text-[#5383E8] tracking-widest uppercase mt-0.5">胜率</span>
                                             </div>
                                         </div>
                                     </div>
                                     ))}
                                 </div>
                             </div>
                             )}

                             {/* Late/Single Items Card */}
                             {opggAnalytics.singleItems?.length > 0 && (
                             <div className="border border-[#37373c] rounded p-3 bg-[#ffffff05]">
                                 <div className="text-[12px] font-bold mb-3 text-[#b2b2b2] uppercase tracking-widest">
                                     后期单件 / 针对性装备 (Late Items)
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
                                     {opggAnalytics.singleItems.sort((a: any, b: any) => b.games - a.games).slice(0, 16).map((item: any, i: number) => (
                                         <div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#ffffff0a] transition-colors group bg-[#00000018]">
                                             <div className="min-w-[16px] text-[10px] font-black text-[#5383E8]">#{i + 1}</div>
                                             <SafeItemTooltip itemId={item.id}>
                                                 <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.id}.png`} className="w-[28px] h-[28px] rounded-[6px] group-hover:scale-110 transition-transform" />
                                             </SafeItemTooltip>
                                             <div className="flex flex-col ml-auto text-right">
                                                 <span className="text-[13px] text-emerald-400 font-black leading-tight">{item.winRate}%</span>
                                                 <span className="text-[9px] text-[#b2b2b2] leading-tight">{item.games.toLocaleString()} GMS</span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             )}

                          </div>
                       ) : (
                          <div className="text-center p-8 text-sm text-gray-500">此英雄的 OP.GG 数据暂时不可用</div>
                       )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-2">
                             <h2 className="font-sans font-semibold text-[13px] text-white uppercase tracking-wider">动态局势金币购买推荐</h2>
                             <span className="text-[10px] text-[#5383E8] bg-[#5383E8]/10 px-1.5 py-0.5 rounded ml-2 font-bold ring-1 ring-[#5383E8]/50">实时数学优化</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-yellow-500 font-mono">我的金币:</span>
                            <div className="relative">
                               <input 
                                   type="number" 
                                   value={currentGold} 
                                   onChange={e => setCurrentGold(Number(e.target.value))} 
                                   className="bg-[#1c2128] border border-[#5383E8]/50 text-yellow-500 font-mono text-sm px-2 py-1 w-24 rounded focus:outline-none focus:border-[#5383E8] transition-colors"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500/50 text-xs">g</span>
                            </div>
                         </div>
                      </div>

                      {attackerBuilds[activeBuildIndex].indexOf(null) === -1 ? (
                         <div className="bg-[#1c2128] p-6 rounded border border-white/5 text-center text-gray-400 text-sm">
                            <Shield className="mx-auto mb-2 text-[#5383E8] opacity-50" size={32} />
                            装备栏已满 (Build Complete)
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {builderRecommendations.map((rec: any, idx: number) => {
                                const tr = idx === 0 ? "border-[#5383E8] bg-gradient-to-br from-[#5383E8]/10 to-transparent" : "border-white/10 bg-[#1c2128]";
                                const tagColor = (tag: string) => {
                                    if(tag.includes("OP")) return "bg-red-500/20 text-red-400 border-red-500/30";
                                    if(tag.includes("神话") || tag.includes("核心")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
                                    if(tag.includes("绝活") || tag.includes("巨核")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
                                    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                                }
                                
                                const topScore = builderRecommendations[0].score;
                                const scoreRatio = rec.score / topScore;
                                let tier = 1;
                                if (idx > 0) {
                                    if (scoreRatio > 0.85) tier = 1;
                                    else if (scoreRatio > 0.70) tier = 2;
                                    else if (scoreRatio > 0.50) tier = 3;
                                    else tier = 4;
                                }
                                
                                return (
                                <div key={rec.item.id} className={cn("rounded border p-3 hover:border-[#5383E8]/70 transition-all cursor-pointer relative overflow-hidden flex flex-col shadow-lg", tr)} onClick={() => onRecommendSelect(rec.item)}>
                                   
                                   {idx === 0 && <div className="absolute top-0 right-0 bg-[#5383E8] text-white text-[9px] font-black px-2 py-0.5 rounded-bl z-10 shadow-md">OP SCORE 1位</div>}
                                   
                                   <div className="flex gap-3 items-center mb-3 group">
                                       <div className="relative">
                                          <div className="absolute -top-1.5 -left-1.5 bg-[#111] border border-white/20 text-white w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px] z-10 shadow-md">{tier}</div>
                                          <img src={rec.item.image} alt={rec.item.name} className="w-11 h-11 rounded-md border border-white/10 group-hover:scale-105 transition-transform" />
                                          <div className="absolute -bottom-1.5 -right-1.5 bg-[#111] border border-white/20 text-yellow-400 text-[9px] font-mono px-1 rounded shadow-md">{rec.item.gold.total}</div>
                                       </div>
                                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                                          <div className="text-[13px] font-bold text-white truncate group-hover:text-[#5383E8] transition-colors">{rec.item.name}</div>
                                          <div className="flex items-center gap-1.5 mt-1 overflow-x-hidden">
                                             {rec.tags && rec.tags.map((tag: string, tIdx: number) => (
                                                <span key={tIdx} className={cn("text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap border font-bold shrink-0", tagColor(tag))}>
                                                    {tag}
                                                </span>
                                             ))}
                                          </div>
                                       </div>
                                       <div className="text-right shrink-0 flex flex-col items-end justify-center">
                                          <div className="text-[14px] font-bold text-[#5383E8] drop-shadow-sm font-sans tracking-tight">{rec.score.toFixed(1)}</div>
                                          <div className="text-[9px] text-[#5383E8]/70 font-bold tracking-wider">综合评分</div>
                                       </div>
                                   </div>

                                   <div className="grid grid-cols-3 gap-2 mt-auto border-t border-[#5383E8]/10 pt-2 bg-[#5383E8]/5 rounded-b-lg -mx-3 -mb-3 p-3 mt-2">
                                      <div className="flex flex-col">
                                          <span className="text-[9px] text-gray-400 mb-0.5 flex items-center gap-1 drop-shadow-md">选取率 <span className="text-[8px] text-gray-500">[{rec.matches.toLocaleString()} 局]</span></span>
                                          <span className="text-[11px] font-sans font-black text-white">{rec.pickRate.toFixed(1)}%</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                          <span className="text-[9px] text-gray-400 mb-0.5">胜率</span>
                                          <span className={cn("text-[11px] font-sans font-black", rec.winRate >= 50 ? "text-[#5383E8]" : "text-red-400")}>{rec.winRate.toFixed(2)}%</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                          <span className="text-[9px] text-gray-400 mb-0.5">预期伤害提升</span>
                                          <span className="text-[11px] font-mono font-black text-[#00F2FF]">+{Math.round(rec.dmgDiff)}</span>
                                      </div>
                                   </div>
                                </div>
                            )})}
                            
                            {builderRecommendations.length === 0 && currentGold < 2000 && (
                                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-6 text-gray-500 text-sm">
                                    金币不足以购买任何成装 (Not enough gold for advanced items)
                                </div>
                            )}
                         </div>
                      )}
                    </div>
                 </div>
               )}
               {centerTab === 'meta' && (
                 <div className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <div>
                      <h2 className="font-sans font-semibold text-[13px] text-text-secondary uppercase tracking-wider mb-4 border-b border-white/10 pb-2">装备胜率趋势 (Meta Analytics)</h2>
                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                           <ComposedChart data={MOCK_META_DATA} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                             <XAxis dataKey="patch" stroke="#ffffff50" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                             <YAxis yAxisId="left" stroke="#a855f7" fontSize={11} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                             <YAxis yAxisId="right" orientation="right" stroke="#00F2FF" fontSize={11} tickFormatter={(val) => `${val}%`} domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} />
                             <RechartsTooltip 
                               contentStyle={{ backgroundColor: '#0e1117', borderColor: '#ffffff20', fontSize: '11px', borderRadius: '8px' }}
                               itemStyle={{ color: '#fff' }}
                             />
                             <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                             <Bar yAxisId="left" dataKey="pickRate" name="选取率 (Pick Rate)" fill="#a855f7" fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={40} />
                             <Line yAxisId="right" type="monotone" dataKey="winRate" name="胜率 (Win Rate)" stroke="#00F2FF" strokeWidth={3} dot={{ r: 4, fill: '#0e1117', stroke: '#00F2FF', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                           </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Sub analysis area */}
                      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="bg-black/30 border border-white/5 p-4 rounded-lg flex flex-col gap-1 items-center justify-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">最高胜率版本</span>
                            <span className="text-xl font-mono text-[#00F2FF] font-bold">14.4</span>
                            <span className="text-[10px] font-mono text-[#4ade80]">+53.8%</span>
                         </div>
                         <div className="bg-black/30 border border-white/5 p-4 rounded-lg flex flex-col gap-1 items-center justify-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">热度巅峰版本</span>
                            <span className="text-xl font-mono text-[#a855f7] font-bold">14.4</span>
                            <span className="text-[10px] font-mono text-[#a855f7]">25.2% Picks</span>
                         </div>
                         <div className="bg-black/30 border border-white/5 p-4 rounded-lg flex flex-col gap-1 items-center justify-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">近期神话协同</span>
                            <span className="text-xl font-mono text-orange-400 font-bold">高</span>
                            <span className="text-[10px] text-gray-500">穿甲/暴击流</span>
                         </div>
                         <div className="bg-black/30 border border-white/5 p-4 rounded-lg flex flex-col gap-1 items-center justify-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">环境评级</span>
                            <span className="text-xl font-mono text-yellow-500 font-bold">T0</span>
                            <span className="text-[10px] text-gray-500">超模装备推荐使用</span>
                         </div>
                      </div>
                    </div>
                 </div>
               )}
               {centerTab === 'combo' && (
                 <div className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-5">
                   
                   {/* Visual Target Health Overview */}
                   <div className="bg-[#0e1117] p-5 rounded-lg border border-[#e74c3c]/30 flex flex-col gap-3 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e74c3c]/0 via-[#e74c3c]/50 to-[#e74c3c]/0 opacity-50"></div>
                     <div className="flex justify-between items-end">
                       <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-[#e74c3c] shadow-[0_0_8px_rgba(231,76,60,0.8)]"></span>
                         斩杀线预测
                       </div>
                       <div className="text-[10px] text-text-secondary uppercase">
                         方案 {activeBuildIndex + 1} 连招伤害
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] font-mono mb-1.5">
                             <span className="text-[#e74c3c] font-bold">-{Math.round(comboDamageAll[activeBuildIndex]?.total || 0)} DMG</span>
                             <span className="text-white">{Math.max(0, Math.round((defenderStats?.hp || 1) - (comboDamageAll[activeBuildIndex]?.total || 0)))} / {Math.round(defenderStats?.hp || 1)} HP</span>
                          </div>
                          
                          {/* Rich Health Bar */}
                          <div className="w-full h-4 bg-black/60 rounded-full overflow-hidden border border-white/10 flex">
                             {(() => {
                               const maxHp = Math.max(defenderStats?.hp || 1, 1);
                               const dmg = comboDamageAll[activeBuildIndex]?.total || 0;
                               const percentRemaining = Math.max(0, Math.min(100, ((maxHp - dmg) / maxHp) * 100));
                               const percentDmg = Math.min(100, (dmg / maxHp) * 100);
                               const isLethal = dmg >= maxHp;
                               
                               return (
                                 <>
                                   <div 
                                     className={cn("h-full transition-all duration-500", isLethal ? "bg-red-900" : "bg-[#4ade80]")} 
                                     style={{ width: `${percentRemaining}%` }} 
                                   />
                                   <div 
                                     className="h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(231,76,60,0.5)_4px,rgba(231,76,60,0.5)_8px)] bg-danger/80 transition-all duration-500 relative" 
                                     style={{ width: `${percentDmg}%` }} 
                                   >
                                     {isLethal && (
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-[9px] text-white tracking-widest drop-shadow-md">
                                          斩杀
                                        </div>
                                     )}
                                   </div>
                                 </>
                               );
                             })()}
                          </div>
                        </div>
                     </div>
                   </div>
                   
                   {/* Interactive Combo Builder */}
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <label className="text-[11px] text-text-secondary uppercase">技能连招制定</label>
                         <button 
                           onClick={() => setComboString("")}
                           className="text-[10px] text-text-secondary hover:text-white transition-colors"
                         >
                           清除
                         </button>
                      </div>
                      
                      {/* Clickable Skill Belt */}
                      <div className="flex gap-2 mb-1 justify-center bg-black/20 p-3 rounded-lg border border-white/5">
                        {['Q', 'W', 'E', 'R'].map((char, idx) => {
                           const spell = attackerChamp?.spells?.[idx];
                           const imgSrc = spell ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.id}.png` : null;
                           return (
                             <button 
                               key={char}
                               className="relative group flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                               onClick={() => setComboString(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + char)}
                             >
                               <div className="w-12 h-12 border border-white/20 rounded shadow-lg overflow-hidden shrink-0 group-hover:border-[#00F2FF]">
                                 {imgSrc ? <img src={imgSrc} draggable="false" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center">{char}</div>}
                               </div>
                               <div className="absolute -bottom-2 bg-black border border-white/10 text-[9px] font-mono px-1.5 rounded text-[#00F2FF] font-bold shadow">
                                 {char}
                               </div>
                             </button>
                           );
                        })}
                        <div className="w-px bg-white/10 mx-2"></div>
                        <button 
                           className="relative group flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                           onClick={() => setComboString(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + 'A')}
                        >
                           <div className="w-12 h-12 border border-white/20 rounded shadow-lg shrink-0 bg-gradient-to-br from-orange-400/20 to-transparent group-hover:border-orange-400 flex items-center justify-center">
                              <span className="text-orange-400 font-bold text-lg">⚔️</span>
                           </div>
                           <div className="absolute -bottom-2 bg-black border border-white/10 text-[9px] font-mono px-1.5 rounded text-orange-400 font-bold shadow">
                             A
                           </div>
                        </button>
                      </div>

                      <div className="flex bg-[#161b22] border border-[#30363d] focus-within:border-[#e74c3c] rounded-lg items-center mt-2 transition-colors relative overflow-hidden">
                        <div className="pl-3 hidden sm:flex items-center gap-1 overflow-x-auto custom-scrollbar flex-nowrap absolute left-0 h-full pointer-events-none opacity-40">
                            {comboString.toUpperCase().replace(/[^AQWER]/g, '').split('').map((char, i) => {
                               const isA = char === 'A';
                               const spell = !isA && attackerChamp?.spells?.[['Q', 'W', 'E', 'R'].indexOf(char)];
                               const imgSrc = spell ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.id}.png` : null;
                               return (
                                  <div key={i} className="w-5 h-5 rounded border border-white/20 overflow-hidden shrink-0 bg-black">
                                      {imgSrc ? <img src={imgSrc} className="w-full h-full object-cover" /> : <div className="text-[10px] w-full h-full flex items-center justify-center font-bold font-mono text-orange-400">A</div>}
                                  </div>
                               );
                            })}
                        </div>
                        <input 
                          type="text" 
                          value={comboString} 
                          onChange={e => setComboString(e.target.value)}
                          className="bg-transparent text-white flex-1 min-w-0 p-3 font-mono text-center tracking-[0.25em] outline-none uppercase placeholder:text-white/20 relative z-10"
                          placeholder="点击技能图标或输入框输入 ( A Q W E R )"
                        />
                      </div>
                   </div>
                   
                   {/* Build Comparison Cards */}
                   <div className="grid grid-cols-3 gap-2 xl:gap-3">
                     {comboDamageAll.map((dmg, idx) => {
                       const attStat = attackerStatsAll[idx];
                       const effArmor = defenderStats ? Math.max(0, defenderStats.armor * (1 - (attStat?.armorPenPct || 0)/100) - (attStat?.lethality || 0)) : 0;
                       const effMr = defenderStats ? Math.max(0, defenderStats.mr * (1 - (attStat?.magicPenPct || 0)/100) - (attStat?.magicPenFlat || 0)) : 0;
                       
                       return (
                       <div 
                         key={idx} 
                         className={cn(
                           "bg-[#0e1117] border cursor-pointer transition-all rounded-lg p-3 relative overflow-hidden group flex flex-col",
                           activeBuildIndex === idx ? "border-[#e74c3c] shadow-[0_0_15px_rgba(231,76,60,0.1)]" : "border-white/10 hover:border-white/30 hover:bg-white/5"
                         )}
                         onClick={() => setActiveBuildIndex(idx)}
                       >
                         {activeBuildIndex === idx && <div className="absolute top-0 left-0 w-full h-0.5 bg-[#e74c3c]" />}
                         <div className="text-[10px] font-bold text-center mb-2 text-text-secondary uppercase pb-1 border-b border-white/5">方案 {idx + 1}</div>
                         <div className="text-center font-mono text-lg text-[#e74c3c] font-bold mb-2 transition-transform group-hover:scale-105">
                           {Math.round(dmg.total) || 0}
                         </div>
                         <div className="flex flex-col gap-1 text-[10px] font-mono mb-2">
                           <div className="flex justify-between text-orange-400 opacity-80"><span>物理:</span> <span>{Math.round(dmg.physical)}</span></div>
                           <div className="flex justify-between text-blue-400 opacity-80"><span>魔法:</span> <span>{Math.round(dmg.magic)}</span></div>
                           <div className="flex justify-between text-white opacity-80"><span>真伤:</span> <span>{Math.round(dmg.true)}</span></div>
                         </div>
                         <div className="mt-auto grid grid-cols-2 gap-1 mb-2">
                           <div className="bg-orange-500/10 border border-orange-500/20 rounded py-0.5 text-center flex flex-col items-center">
                             <span className="text-[8px] text-orange-500/60 leading-none">目标等效护甲</span>
                             <span className="text-orange-400 text-xs font-mono font-bold">{Math.round(effArmor)}</span>
                           </div>
                           <div className="bg-blue-500/10 border border-blue-500/20 rounded py-0.5 text-center flex flex-col items-center">
                             <span className="text-[8px] text-blue-400/60 leading-none">目标等效魔抗</span>
                             <span className="text-blue-400 text-xs font-mono font-bold">{Math.round(effMr)}</span>
                           </div>
                         </div>
                         <div className="w-full h-1 mt-1 bg-black rounded-full overflow-hidden flex shadow-inner">
                            {dmg.total > 0 ? (
                               <>
                                 <div style={{ width: `${(dmg.physical / dmg.total) * 100}%` }} className="bg-orange-400 h-full"></div>
                                 <div style={{ width: `${(dmg.magic / dmg.total) * 100}%` }} className="bg-blue-400 h-full"></div>
                                 <div style={{ width: `${(dmg.true / dmg.total) * 100}%` }} className="bg-white h-full"></div>
                               </>
                            ) : (
                               <div className="w-full h-full bg-white/10"></div>
                            )}
                         </div>
                       </div>
                     )})}
                   </div>
                   
                   {/* Cinematic Timeline Breakdown Log */}
                   <div className="bg-[#0e1117] rounded-lg flex-1 min-h-[250px] flex flex-col border border-white/5 pb-4">
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                         <span className="text-[11px] font-bold text-white uppercase tracking-wider">操作时间轴模拟</span>
                         {attackerMerakiError ? (
                            <span className="text-[9px] px-2 border border-red-500/30 text-red-400 rounded bg-red-500/10 truncate max-w-[200px]" title={attackerMerakiError}>
                               API Error: {attackerMerakiError}
                            </span>
                         ) : attackerMeraki ? (
                            <span className="text-[9px] px-2 border border-green-500/30 text-green-400 rounded bg-green-500/10">Meraki Coefficients Synced</span>
                         ) : (
                            <span className="text-[9px] px-2 border border-yellow-500/30 text-yellow-500 rounded bg-yellow-500/10 hover:bg-yellow-500 hover:text-black cursor-pointer transition-colors" onClick={() => window.location.reload()}>
                               {loading ? 'Please Wait...' : 'Refresh to Retry API...'}
                            </span>
                         )}
                      </div>
                      <div className="overflow-y-auto custom-scrollbar flex-1 relative px-4">
                        {/* Timeline Track */}
                        {comboDamageAll[activeBuildIndex]?.log && comboDamageAll[activeBuildIndex].log.length > 0 && (
                          <div className="absolute left-[68px] top-6 bottom-4 w-px bg-white/10 z-0"></div>
                        )}
                        
                        <ul className="pt-4 space-y-3 relative z-10">
                          {comboDamageAll[activeBuildIndex]?.log.map((entry: any, i) => {
                            const isPhys = entry.type === 'Physical';
                            const isMag = entry.type === 'Magic';
                            
                            let colorClass = "text-white";
                            if (isPhys) colorClass = "text-orange-400";
                            if (isMag) colorClass = "text-blue-400";
                            
                            const isAttack = entry.key === 'A';
                            const spellIdx = ['Q', 'W', 'E', 'R'].indexOf(entry.key);
                            const spell = !isAttack && attackerChamp?.spells?.[spellIdx];
                            const imgSrc = spell ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.id}.png` : null;

                            return (
                              <li key={i} className="flex items-center gap-4 group">
                                 {/* Index indicator */}
                                 <div className="text-[9px] font-mono text-text-secondary w-4 text-right opacity-50 shrink-0 group-hover:opacity-100 transition-opacity">
                                    {(i+1).toString().padStart(2, '0')}
                                 </div>
                                 
                                 {/* Icon node */}
                                 <div className="w-10 h-10 rounded-full border-2 border-[#161b22] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-[#0e1117] flex items-center justify-center shrink-0 overflow-hidden relative z-10 group-hover:border-[#e74c3c] transition-colors">
                                    {imgSrc ? (
                                        <img src={imgSrc} alt={entry.key} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={cn("text-[14px]", isAttack ? "text-orange-400" : "text-white")}>{isAttack ? '⚔️' : entry.key}</span>
                                    )}
                                 </div>
                                 
                                 {/* Content Card */}
                                 <div className="flex-1 bg-black/20 group-hover:bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center justify-between transition-colors">
                                    <div className="flex flex-col">
                                       <div className="flex items-center gap-2">
                                          <span className="text-[12px] font-bold text-white tracking-wide">{entry.label}</span>
                                          {entry.isCrit && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1 rounded shadow">暴击期望</span>}
                                       </div>
                                       <span className="text-[10px] text-text-secondary font-mono">
                                          {isAttack ? '普通攻击' : `技能使用 (${entry.key})`}
                                          {entry.details && <span className="opacity-70 ml-2 hidden sm:inline-block">({entry.details})</span>}
                                       </span>
                                    </div>
                                    <div className={`text-[15px] font-mono font-bold flex gap-2 items-center text-right ${colorClass}`}>
                                       <span className="drop-shadow-lg">{Math.round(entry.damage)}</span>
                                       <div className={cn(
                                          "text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-current opacity-70",
                                          isPhys && "bg-orange-400/10",
                                          isMag && "bg-blue-400/10"
                                       )}>
                                         {entry.type === "Physical" ? "物理" : entry.type === "Magic" ? "魔法" : entry.type === "True" ? "直击" : entry.type}
                                       </div>
                                    </div>
                                 </div>
                              </li>
                            );
                          })}
                        </ul>
                        {(!comboDamageAll[activeBuildIndex]?.log || comboDamageAll[activeBuildIndex].log.length === 0) && (
                          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-50 py-12">
                             <div className="text-[24px] mb-2">🤷</div>
                             <div className="text-[11px] uppercase tracking-widest">无操作序列指令</div>
                             <div className="text-[10px] mt-1">请在上方制定一次技能连击序列</div>
                          </div>
                        )}
                      </div>
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Right Column: Defender */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-6 rounded-lg">
          <div className="glass-card flex flex-col min-h-0 bg-[#0e1117] border-t-2 border-t-danger">
            <div className="p-4 flex flex-col gap-4 border-b border-white/5">
              <h2 className="font-sans font-semibold text-[14px] text-danger tracking-wider uppercase flex items-center justify-between">
                <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full border border-danger/20">RED TEAM</span>
                <span>目标靶机</span>
              </h2>
              <ChampionSelector champions={CHAMPIONS} selectedChamp={defenderChamp} onSelect={(c) => setDefenderChampId(c.id)} />
              
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">英雄等级:</span>
                  <span className="font-mono text-danger font-bold">Lv {defenderLevel}</span>
                </div>
                <input 
                  type="range" min="1" max="18" value={defenderLevel} 
                  onChange={e => setDefenderLevel(Number(e.target.value))}
                  className="w-full accent-danger h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer flex-row-reverse"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="p-4 bg-black/20 relative">
               <div className="flex items-center justify-between mb-3 flex-row-reverse">
                 <div className="text-danger text-[11px] font-bold tracking-wider">技能组</div>
                 <div className="text-[9px] text-text-secondary opacity-60">点击开关防御增益</div>
               </div>
               <div className="flex gap-2 justify-end">
                 {defenderChamp?.spells?.map((s: any, idx: number) => {
                    const isActive = defenderActiveSpells[s.id];
                    return (
                      <div 
                        key={s.id} 
                        className="relative cursor-pointer" 
                        onClick={() => toggleDefenderSpell(s.id)}
                        onMouseEnter={(e) => setGlobalTooltip({ spell: s, tencentData: defenderTencentData, spellIndex: idx, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setGlobalTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setGlobalTooltip(null)}
                      >
                         <img 
                           src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${s.id}.png`} 
                           className={`w-8 h-8 rounded border transition-all hover:scale-110 ${isActive ? 'border-danger shadow-[0_0_8px_rgba(231,76,60,0.5)] scale-105' : 'border-danger/30 grayscale-[50%]'}`} 
                         />
                         {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full text-white flex items-center justify-center text-[8px] font-bold z-10">✓</div>}
                      </div>
                    );
                 })}
                 {defenderChamp?.passive && (
                    <div 
                      className="relative cursor-help"
                      onMouseEnter={(e) => setGlobalTooltip({ spell: defenderChamp.passive, tencentData: defenderTencentData, isPassive: true, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setGlobalTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setGlobalTooltip(null)}
                    >
                      <img 
                        alt={defenderChamp.passive.name} 
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${defenderChamp.passive.image.full}`} 
                        className="w-8 h-8 rounded-full border border-white/20 grayscale hover:grayscale-0 transition-all" 
                      />
                    </div>
                 )}
               </div>
            </div>
          </div>
          
          <div className="glass-card max-h-[300px]">
             <div className="p-3">
               <BuildPanel 
                 title="目标出装" 
                 build={defenderBuild} 
                 stats={defenderStats} 
                 colorClass="border-danger/30" 
                 textColor="text-danger"
                 items={ITEMS}
                 onDrop={(e: any, i: number) => handleDrop(e, 'Defender', i)}
                 onRemove={(i: number) => { const n = [...defenderBuild]; n[i] = null; setDefenderBuild(n); }}
               />
             </div>
          </div>
        </div>

      </div>

      {/* AI Config Modal */}
      {showOptSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden max-w-xl w-full">
              <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-black/20">
                 <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                    <span className="text-[#00F2FF]">✨</span> AI 战术级出装优化面板配置
                 </h2>
                 <button onClick={() => setShowOptSettings(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 
                 {/* Objective Settings */}
                 <div>
                    <h3 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Optimization Goal</h3>
                    <div className="space-y-2">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" checked={optSettings.m6_objective === 'none'} onChange={() => setOptSettings(prev => ({...prev, m6_objective: 'none'}))} className="accent-[#00F2FF] w-4 h-4" />
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">目标类型 6: 无 (智能推导)</div>
                             <div className="text-[11px] text-gray-500">不人为限制目标类型，主要依据连招本身和技能倍率（通过M10 OP.GG及M9自动评估）自由得出最高期望。</div>
                          </div>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" checked={optSettings.m6_objective === 'burst'} onChange={() => setOptSettings(prev => ({...prev, m6_objective: 'burst'}))} className="accent-[#00F2FF] w-4 h-4" />
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">目标类型 6.A: 最大化单轮爆发 (核爆模式)</div>
                             <div className="text-[11px] text-gray-500">依据所选连招时序进行完整打桩模拟，得出单轮极限斩杀线，适合法师、刺客的纯爆发装备计算。</div>
                          </div>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" checked={optSettings.m6_objective === 'dps'} onChange={() => setOptSettings(prev => ({...prev, m6_objective: 'dps'}))} className="accent-[#00F2FF] w-4 h-4" />
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">目标类型 6.B: 最大化持续输出 (平A/ADC模式)</div>
                             <div className="text-[11px] text-gray-500">无视技能连招时序，以攻速收益为主推算最强站桩白字DPS。</div>
                          </div>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" checked={optSettings.m6_objective === 'bruiser'} onChange={() => setOptSettings(prev => ({...prev, m6_objective: 'bruiser'}))} className="accent-[#00F2FF] w-4 h-4" />
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">目标类型 6.C: 重装战士帕累托博弈 (伤害 × 坦度指数)</div>
                             <div className="text-[11px] text-gray-500">计算最优生存率容错度与输出的均衡折中模型，得出半肉最优解。</div>
                          </div>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" checked={optSettings.m6_objective === 'tank'} onChange={() => setOptSettings(prev => ({...prev, m6_objective: 'tank'}))} className="accent-[#00F2FF] w-4 h-4" />
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">目标类型 6.D: 纯坦克特化路线 (有效生命值映射)</div>
                             <div className="text-[11px] text-gray-500">反推敌方目标面板（法术/物理占比和穿透），求算最高收益的承伤抗性肉装。</div>
                          </div>
                       </label>
                    </div>
                 </div>

                 {/* Algorithmic Search Base */}
                 <div>
                    <h3 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mb-3 border-b border-white/5 pb-1">搜索算法策略</h3>
                    <div className="space-y-3">
                       <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="pt-0.5">
                             <input type="checkbox" checked={!optSettings.m4_ga && !optSettings.m5_sa} onChange={() => setOptSettings(prev => ({...prev, m4_ga: false, m5_sa: false}))} className="accent-[#00F2FF] w-4 h-4" />
                          </div>
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium flex gap-2">算法 3: 多点启发式爬山算法 (随机梯度上升) 
                                {optSettings.m3_seed && <span className="bg-[#e74c3c]/20 text-[#e74c3c] text-[9px] px-1.5 py-0.5 rounded border border-[#e74c3c]/30">Active</span>}
                             </div>
                             <div className="text-[11px] text-gray-500">注入5个正交装备模板起点，执行快速的爬山推演，有效避开局部最优陷阱跳跃至全局最优附近。</div>
                          </div>
                       </label>
                       <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="pt-0.5">
                             <input type="checkbox" checked={optSettings.m4_ga} onChange={() => setOptSettings(prev => ({...prev, m4_ga: !prev.m4_ga, m5_sa: false}))} className="accent-[#00F2FF] w-4 h-4" />
                          </div>
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">算法 4: 遗传算法 (交叉/变异)</div>
                             <div className="text-[11px] text-gray-500">部署50代种群进化；将不同的优秀装备方案进行基因融合与突变，筛选出完美共鸣出装。</div>
                          </div>
                       </label>
                       <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="pt-0.5">
                             <input type="checkbox" checked={optSettings.m5_sa} onChange={() => setOptSettings(prev => ({...prev, m5_sa: !prev.m5_sa, m4_ga: false}))} className="accent-[#00F2FF] w-4 h-4" />
                          </div>
                          <div>
                             <div className="text-sm text-gray-200 group-hover:text-white font-medium">算法 5: 模拟退火算法 (热力学衰减)</div>
                             <div className="text-[11px] text-gray-500">运用前期的高温熵增（允许较差替换以跳出局部最优解陷阱坑），并逐步降温逼近绝对最高性能组合。</div>
                          </div>
                       </label>
                    </div>
                 </div>

                 {/* Advanced Heuristics */}
                 <div>
                    <h3 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mb-3 border-b border-white/5 pb-1">预处理启发式过滤机制 (降维扫描)</h3>
                    <div className="grid grid-cols-1 gap-3">
                       <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-gray-200 font-medium">机制 1: 属性敏感度偏导探测</div>
                             <div className="text-[10px] text-gray-500 mt-1 mr-4">测试空装备配置基线，向其注入微量单项属性 (+100 物理攻击, +1000 生命值)，测量收益导数向量以发现英雄隐藏的混伤机制。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m1_gradient} onChange={() => setOptSettings(prev=>({...prev, m1_gradient: !prev.m1_gradient}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m1_gradient ? '0' : '20px', borderColor: optSettings.m1_gradient ? '#00F2FF' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m1_gradient ? '#00F2FF' : '#333' }}></label>
                          </div>
                       </label>
                       
                       <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-gray-200 font-medium">机制 2: 官方职业模板锚定</div>
                             <div className="text-[10px] text-gray-500 mt-1 mr-4">基于英雄的后台预设角色标签（如坦克、法师）进行硬过滤。阻止AI搜索出过于极端的非主流方案。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m2_role} onChange={() => setOptSettings(prev=>({...prev, m2_role: !prev.m2_role}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m2_role ? '0' : '20px', borderColor: optSettings.m2_role ? '#00F2FF' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m2_role ? '#00F2FF' : '#333' }}></label>
                          </div>
                       </label>
                       
                       <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-gray-200 font-medium">机制 7: 经济效能转化图谱 (性价比)</div>
                             <div className="text-[10px] text-gray-500 mt-1 mr-4">通过将（收益/总金币消耗）加入拟合函数，使得AI注重性价比，找出经济转化率最高的配凑组合。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m7_gold} onChange={() => setOptSettings(prev=>({...prev, m7_gold: !prev.m7_gold}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m7_gold ? '0' : '20px', borderColor: optSettings.m7_gold ? '#00F2FF' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m7_gold ? '#00F2FF' : '#333' }}></label>
                          </div>
                       </label>
                       
                       <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-gray-200 font-medium">机制 8: 技能频次重编码惩罚</div>
                             <div className="text-[10px] text-gray-500 mt-1 mr-4">施加动态不稳定性惩罚。如果玩家输入的连招中包含了大量法术技能（QWE）但极少平A，则判定该模板为施法主导，并主动惩罚纳什之牙这类装备。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m8_combo} onChange={() => setOptSettings(prev=>({...prev, m8_combo: !prev.m8_combo}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m8_combo ? '0' : '20px', borderColor: optSettings.m8_combo ? '#00F2FF' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m8_combo ? '#00F2FF' : '#333' }}></label>
                          </div>
                       </label>

                       <label className="flex items-center justify-between p-3 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/30 cursor-pointer hover:bg-[#a855f7]/20 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-[#a855f7] font-medium font-bold">机制 9: 基于英雄技能加成的装备预筛</div>
                             <div className="text-[10px] text-gray-400 mt-1 mr-4">基于一阶微分自动推导英雄的法强/攻击力/生命值等关键收益阈值，杜绝法师出AD的神奇操作，并大幅度缩减运算规模并提升精准度。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m9_synergy_filter} onChange={() => setOptSettings(prev=>({...prev, m9_synergy_filter: !prev.m9_synergy_filter}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m9_synergy_filter ? '0' : '20px', borderColor: optSettings.m9_synergy_filter ? '#a855f7' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m9_synergy_filter ? '#a855f7' : '#333' }}></label>
                          </div>
                       </label>

                       <label className="flex items-center justify-between p-3 rounded-lg bg-[#5383E8]/10 border border-[#5383E8]/30 cursor-pointer hover:bg-[#5383E8]/20 transition-colors">
                          <div className="flex-1">
                             <div className="text-sm text-[#5383E8] font-medium font-bold">机制 10: 真实 OP.GG 三件套/单件胜率数据引擎</div>
                             <div className="text-[10px] text-gray-400 mt-1 mr-4">抓取英雄联盟白金+段位的真实 OP.GG 胜率API，将大数据三件套胜率与单件胜率作为辅助锚点代入遗传算法评价函数，从而得出既符合实际操作手感，又上限超绝的最强装备。</div>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input type="checkbox" name="toggle" checked={optSettings.m10_opgg} onChange={() => setOptSettings(prev=>({...prev, m10_opgg: !prev.m10_opgg}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: optSettings.m10_opgg ? '0' : '20px', borderColor: optSettings.m10_opgg ? '#5383E8' : '#555' }}/>
                              <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer" style={{ backgroundColor: optSettings.m10_opgg ? '#5383E8' : '#333' }}></label>
                          </div>
                       </label>
                    </div>
                 </div>

              </div>
              <div className="p-4 border-t border-[#30363d] bg-black/40 flex justify-end">
                 <button 
                   onClick={() => { setShowOptSettings(false); optimizeBuild(); }} 
                   className="bg-[#00F2FF] hover:bg-[#00F2FF]/80 text-black px-6 py-2 rounded font-bold text-xs tracking-wider transition-colors shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                 >
                   保存并执行 AI 演算
                 </button>
              </div>
           </motion.div>
        </div>
      )}

    </motion.div>
  );
}

function GlobalSpellTooltip({ tooltip }: { tooltip: { spell: any, tencentData: any, isPassive?: boolean, spellIndex?: number, x: number, y: number } | null }) {
  if (!tooltip) return null;

  const { spell, tencentData, isPassive, spellIndex, x, y } = tooltip;

  let tencentSpell = null;
  if (tencentData && tencentData.spells) {
     if (isPassive) {
        tencentSpell = tencentData.spells.find((s:any) => s.spellKey === 'passive');
     } else {
        const keyMap = ['q', 'w', 'e', 'r'];
        const key = keyMap[spellIndex ?? 0];
        tencentSpell = tencentData.spells.find((s:any) => s.spellKey === key);
     }
  }

  const desc = tencentSpell ? tencentSpell.description : spell.description;

  // Position tooltip relative to mouse to prevent cutoff
  const xOffset = 15;
  const yOffset = 15;
  const tooltipWidth = 300;
  
  // Predict if it goes off screen (assuming approx 400px height for tooltip max)
  const isTooFarRight = x + tooltipWidth + xOffset > window.innerWidth;
  const isTooFarDown = y + 400 + yOffset > window.innerHeight;
  
  const finalX = isTooFarRight ? x - tooltipWidth - xOffset : x + xOffset;
  const finalY = isTooFarDown ? window.innerHeight - 400 : y + yOffset;

  return (
    <div 
       className="fixed z-[100] w-[300px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-4 pointer-events-none"
       style={{ left: finalX, top: Math.max(10, finalY) }}
    >
       <div className="font-bold text-[13px] text-white flex justify-between items-start mb-2">
         <span>{tencentSpell?.name || spell.name}</span>
         {spell.cooldownBurn && <span className="text-[10px] text-[#8B949E] font-mono shrink-0 ml-4">CD: {spell.cooldownBurn}s</span>}
       </div>
       <div className="text-[12px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: desc }} />
       {tencentSpell?.cost && tencentSpell.cost !== '0/0/0/0/0' && tencentSpell.cost !== '0' && (
         <div className="mt-2 text-[10px] text-[#00F2FF] font-mono">Cost: {tencentSpell.cost}</div>
       )}
    </div>
  )
}

function StatRow5({ label, valT, val1, val2, val3, isFixed, isPercent }: { label: string, valT: any, val1: any, val2: any, val3: any, isFixed?: boolean, isPercent?: boolean }) {
  const format = (v: any) => {
    if (v === undefined || v === null) return '-';
    if (typeof v === 'string') return v;
    if (isPercent) return `${Math.round(v)}%`;
    if (isFixed) return Number(v).toFixed(2);
    return Math.round(v);
  };
  return (
    <>
      <div className="text-text-secondary border-t border-border-subtle/50 py-1 flex items-center justify-center">{label}</div>
      <div className="text-danger font-mono text-center border-t border-border-subtle/50 py-1 bg-danger/5">{format(valT)}</div>
      <div className="text-[#00F2FF] font-mono text-center border-t border-border-subtle/50 py-1 bg-[#00F2FF]/5">{format(val1)}</div>
      <div className="text-[#00F2FF] font-mono text-center border-t border-border-subtle/50 py-1 bg-[#00F2FF]/5">{format(val2)}</div>
      <div className="text-[#00F2FF] font-mono text-center border-t border-border-subtle/50 py-1 bg-[#00F2FF]/5">{format(val3)}</div>
    </>
  );
}

function BuildPanel({ title, build, stats, colorClass, textColor, items, onDrop, onRemove }: any) {
  return (
    <div className={cn("glass-card p-4 flex flex-col gap-3 border-l-4", colorClass)}>
      <div className="flex justify-between items-center">
        <h3 className={cn("font-sans font-bold text-[14px]", textColor)}>{title}</h3>
        <span className="font-mono text-xs text-yellow-400">{stats?.cost || 0} G</span>
      </div>
      
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({length: 6}).map((_, i) => {
          const itemId = build[i];
          const item = itemId ? items.find((it: any) => it.id === itemId) : null;
          return (
            <div 
              key={i} 
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, i)}
              className="aspect-square bg-background border border-border-subtle rounded flex items-center justify-center relative overflow-hidden group hover:border-primary/50 transition-colors"
            >
              {item ? (
                <ItemTooltip item={item}>
                  <div className="w-full h-full cursor-pointer relative group/item">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity"
                         onClick={() => onRemove(i)}>
                      <X size={14} className="text-white hover:text-danger flex-shrink-0" />
                    </div>
                  </div>
                </ItemTooltip>
              ) : (
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-700" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
