export type DamageLogEntry = {
  key: string;
  label: string;
  damage: number;
  type: 'Physical' | 'Magic' | 'True';
  details?: string;
  isCrit?: boolean;
};

export function calculateComboDamage(combo: string, attackerStats: any, defenderStats: any, merakiData: any, attackerLevel: number = 18, attackerActive: Record<string, boolean> = {}, defenderActive: Record<string, boolean> = {}) {
  let totalData = { physical: 0, magic: 0, trueDamage: 0, log: [] as DamageLogEntry[] };

  if (!attackerStats || !defenderStats) {
    totalData.log.push({ key: 'ERR', label: 'Stats Error', damage: 0, type: 'True', details: 'Waiting for Champion Data to Load' });
    return { total: 0, physical: 0, magic: 0, true: 0, log: totalData.log };
  }

  const sequence = combo.toUpperCase().replace(/[^AQWER]/g, '').split('');

  if (sequence.length === 0) {
    return { total: 0, physical: 0, magic: 0, true: 0, log: [] };
  }

  // Heuristic spell level distribution
  let rLvl = attackerLevel >= 16 ? 3 : attackerLevel >= 11 ? 2 : attackerLevel >= 6 ? 1 : 0;
  let remaining = attackerLevel - rLvl;
  
  // By level 3, assume Q=1, W=1, E=1.
  let qLvl = 1, wLvl = 1, eLvl = 1;
  remaining -= 3;
  
  if (remaining > 0) {
     let qAdd = Math.min(4, remaining);
     qLvl += qAdd;
     remaining -= qAdd;
  }
  if (remaining > 0) {
     let wAdd = Math.min(4, remaining);
     wLvl += wAdd;
     remaining -= wAdd;
  }
  if (remaining > 0) {
     let eAdd = Math.min(4, remaining);
     eLvl += eAdd;
     remaining -= eAdd;
  }
  
  // Edge cases for lvl 1/2
  if (attackerLevel === 1) { wLvl = 0; eLvl = 0; }
  if (attackerLevel === 2) { eLvl = 0; }

  const getSpellLevel = (key: string) => {
    if (key === 'Q') return qLvl;
    if (key === 'W') return wLvl;
    if (key === 'E') return eLvl;
    if (key === 'R') return rLvl;
    return 1;
  };

  sequence.forEach(key => {
    
    if (key === 'A') {
      // Auto Attack
      let physical = attackerStats.ad || 0;
      // Crit average
      let critChance = Math.min((attackerStats.crit || 0) / 100, 1);
      let critMult = 0.75 + (attackerStats.critDmgMod || 0);
      let isCrit = false;
      let rawDamage = physical;
      
      // Simulate expected value auto attack for combo
      rawDamage = rawDamage * (1 + (critChance) * critMult); // base crit extra dmg
      if (critChance > 0) isCrit = true;
      
      let onHitMag = 0;
      let onHitPhys = 0;
      let onHitTrue = 0;
      let onHitDetails = [];

      if (attackerStats.items) {
        if (attackerStats.items.includes('3153')) { // Blade of the Ruined King
           let borkDmg = defenderStats.hp * 0.08; // approximation
           onHitPhys += borkDmg;
           onHitDetails.push(`BotRK: ${Math.round(borkDmg)}`);
        }
        if (attackerStats.items.includes('3115')) { // Nashor's Tooth
           let nashor = 15 + (attackerStats.ap * 0.20);
           onHitMag += nashor;
           onHitDetails.push(`Nashor: ${Math.round(nashor)}`);
        }
        if (attackerStats.items.includes('3091')) { // Wit's End
           let wits = 15 + (attackerLevel || 18) * 3.5; // approximation
           onHitMag += wits;
           onHitDetails.push(`Wit's End: ${Math.round(wits)}`);
        }
        if (attackerStats.items.includes('6672')) { // Kraken Slayer
           let kraken = (50 + (attackerStats.ad * 0.15)) / 3; // divided by 3 since it is every 3rd proc
           onHitPhys += kraken;
           onHitDetails.push(`Kraken Avg: ${Math.round(kraken)}`);
        }
        if (attackerStats.items.includes('3124')) { // Guinsoo's Rageblade
           let guinsoo = 30; // base on-hit
           onHitMag += guinsoo;
           onHitDetails.push(`Guinsoo: ${Math.round(guinsoo)}`);
        }
      }
      
      let effArmor = Math.max(0, defenderStats.armor * (1 - (attackerStats.armorPenPct || 0)/100) - (attackerStats.lethality || 0));
      let mitigationRatio = (100 / (100 + effArmor));
      let mitigatedPhys = (rawDamage + onHitPhys) * mitigationRatio;

      let magicPenFlat = attackerStats.magicPenFlat || 0;
      let magicPenPct = attackerStats.magicPenPct || 0;
      let effMR = Math.max(0, defenderStats.mr * (1 - magicPenPct/100) - magicPenFlat);
      let mitigatedMag = onHitMag * (100 / (100 + effMR));

      let mitigatedTotal = mitigatedPhys + mitigatedMag + onHitTrue;

      if (defenderActive['AlistarR']) mitigatedTotal *= 0.45;
      if (defenderActive['GarenW']) mitigatedTotal *= 0.70;
      
      totalData.physical += (mitigatedPhys * (mitigatedTotal / (mitigatedPhys + mitigatedMag + onHitTrue || 1)));
      totalData.magic += (mitigatedMag * (mitigatedTotal / (mitigatedPhys + mitigatedMag + onHitTrue || 1)));
      totalData.trueDamage += (onHitTrue * (mitigatedTotal / (mitigatedPhys + mitigatedMag + onHitTrue || 1)));

      let textDetails = `Raw Dmg: ${Math.round(rawDamage)} | Armor: ${Math.round(defenderStats.armor)} -> ${Math.round(effArmor)} (${Math.round((1-mitigationRatio)*100)}% reduced)`;
      if (onHitDetails.length > 0) {
        textDetails += ` | OnHit: ${onHitDetails.join(', ')}`;
      }

      totalData.log.push({ 
        key: 'A', 
        label: 'Auto Attack', 
        damage: Math.round(mitigatedTotal), 
        type: 'Physical',
        isCrit,
        details: textDetails
      });
      return;
    }

    // Check if it's a spell
    if (!merakiData || !merakiData.abilities || !merakiData.abilities[key]) {
      totalData.log.push({ key, label: `Spell ${key}`, damage: 0, type: 'Magic', details: merakiData ? 'No Skill Data Found' : 'Waiting for Spell API...' });
      return;
    }
    const ability = merakiData.abilities[key][0];
      if (!ability || !ability.effects) {
         totalData.log.push({ key, label: `Spell ${key}`, damage: 0, type: 'Magic', details: 'No numeric mechanics found' });
         return;
      }

      const spellLevel = getSpellLevel(key);
      if (spellLevel === 0) {
        totalData.log.push({ key, label: ability.name || `Spell ${key}`, damage: 0, type: 'Magic', details: `Unlearned at Level ${attackerLevel}` });
        return;
      }

      let spellDmg = 0;
      let spType = 'Magic' as 'Physical' | 'Magic' | 'True';

      if (ability.damageType) {
        if (ability.damageType.includes('PHYSICAL')) spType = 'Physical';
        else if (ability.damageType.includes('TRUE')) spType = 'True';
      }

      let hasDamage = false;
      let scalingDetails: string[] = [];

      ability.effects.forEach((eff: any) => {
        const desc = eff.description.toLowerCase();
        if (desc.includes('damage') && !desc.includes('damage reduction') && !desc.includes('minion') && !desc.includes('monster')) {
          hasDamage = true;
          // Only override if damageType was missing or it's explicitly mixed damage type in description
          if (!ability.damageType) {
             if (desc.includes('physical')) spType = 'Physical';
             else if (desc.includes('true')) spType = 'True';
             else spType = 'Magic';
          }

          if (eff.leveling) {
            eff.leveling.forEach((lvl: any) => {
               if (lvl.modifiers) {
                  let partDmg = 0;
                   lvl.modifiers.forEach((mod: any) => {
                     const val = mod.values[(spellLevel - 1) % mod.values.length] || 0;
                     const rawUnit = mod.units[(spellLevel - 1) % mod.units.length] || '';
                     const unit = rawUnit.toLowerCase();
                     
                     let portion = 0;
                     if (unit === '') portion = val;
                     else if (unit.includes('% ap')) portion = val/100 * attackerStats.ap;
                     else if (unit.includes('% bonus ad')) portion = val/100 * Math.max(0, attackerStats.ad - (attackerStats.baseAd || 0));
                     else if (unit.includes('% ad')) portion = val/100 * attackerStats.ad;
                     else if (unit.includes('% target max hp') || unit.includes('% target\'s maximum health')) portion = val/100 * defenderStats.hp;
                     else if (unit.includes('% target current hp') || unit.includes('% target\'s current health')) portion = val/100 * defenderStats.hp;
                     else if (unit.includes('% bonus health')) portion = val/100 * Math.max(0, attackerStats.hp - (attackerStats.baseHp || attackerStats.hp));
                     else if (unit.includes('% maximum health') || unit.includes('% max hp')) portion = val/100 * attackerStats.hp;
                     else if (unit.includes('% armor')) portion = val/100 * attackerStats.armor;
                     else if (unit.includes('% magic resistance')) portion = val/100 * attackerStats.mr;
                     
                     partDmg += portion;
                     
                     if (portion > 0) {
                       if (unit === '') {
                          // Prevent adding "number of arrows", if the value is very small (< 15) and level 5 it might be counts, but we'll leave it as is to keep it simple.
                          scalingDetails.push(`${Math.round(portion)} Base`);
                       }
                       else scalingDetails.push(`${Math.round(portion)} (${rawUnit.replace('%', 'pct')})`);
                     }
                  });
                  spellDmg += partDmg;
               }
            });
          }
        }
      });

      if (!hasDamage) {
        totalData.log.push({ key, label: ability.name || `Spell ${key}`, damage: 0, type: 'Magic', details: 'Utility / No Damage' });
        return;
      }

      // Mitigation
      let mitigated = spellDmg;
      let effResist = 0;
      let mitigationRatio = 1;
      
      let logResistText = '';
      if (spType === 'Physical') {
        effResist = Math.max(0, defenderStats.armor * (1 - (attackerStats.armorPenPct || 0)/100) - (attackerStats.lethality || 0));
        mitigationRatio = (100 / (100 + effResist));
        mitigated = spellDmg * mitigationRatio;
        
        if (defenderActive['AlistarR']) mitigated *= 0.45;
        if (defenderActive['GarenW']) mitigated *= 0.70;
        
        totalData.physical += mitigated;
        logResistText = `Armor: ${Math.round(defenderStats.armor)} -> ${Math.round(effResist)} (${Math.round((1-mitigationRatio)*100)}% reduced)`;
      } else if (spType === 'Magic') {
        let magicPenFlat = attackerStats.magicPenFlat || 0;
        let magicPenPct = attackerStats.magicPenPct || 0;
        effResist = Math.max(0, defenderStats.mr * (1 - magicPenPct/100) - magicPenFlat);
        mitigationRatio = (100 / (100 + effResist));
        mitigated = spellDmg * mitigationRatio;

        if (defenderActive['AlistarR']) mitigated *= 0.45;
        if (defenderActive['GarenW']) mitigated *= 0.70;

        totalData.magic += mitigated;
        logResistText = `MR: ${Math.round(defenderStats.mr)} -> ${Math.round(effResist)} (${Math.round((1-mitigationRatio)*100)}% reduced)`;
      } else {
        totalData.trueDamage += mitigated;
      }

      let detailsString = scalingDetails.join(' + ');
      if (spType !== 'True') {
         detailsString += ` | ${logResistText}`;
      }

      totalData.log.push({ 
        key, 
        label: ability.name || `Spell ${key}`, 
        damage: Math.round(mitigated), 
        type: spType,
        details: detailsString || 'Unrecognized Data'
      });
  });

  // Calculate Generic Item Spell Effects once per combo if at least one spell was cast
  const spellsCast = sequence.filter(k => k !== 'A').length;
  if (spellsCast > 0 && attackerStats.items) {
      let procMag = 0;
      let procPhys = 0;
      let procTrue = 0;
      let procDetails = [];

      if (attackerStats.items.includes('3151')) { // Liandry's Torment
          // 6% max hp magic damage over 3 seconds (approx 1 application)
          let liandry = defenderStats.hp * 0.06;
          procMag += liandry;
          procDetails.push(`Liandry: ${Math.round(liandry)}`);
      }
      if (attackerStats.items.includes('3100')) { // Lich Bane
          // Assuming 1 proc: 75% base AD + 50% AP
          let lich = (attackerStats.baseAd || 0) * 0.75 + (attackerStats.ap * 0.50);
          procMag += lich;
          procDetails.push(`Lich Bane: ${Math.round(lich)}`);
      }
      if (attackerStats.items.includes('3152')) { // Hextech Rocketbelt
          let rocket = 125 + (attackerStats.ap * 0.15);
          procMag += rocket;
          procDetails.push(`Rocketbelt: ${Math.round(rocket)}`);
      }
      if (attackerStats.items.includes('6653')) { // Luden's (mocked as old Luden's or generic burst)
          let luden = 100 + (attackerStats.ap * 0.10);
          procMag += luden;
          procDetails.push(`Luden: ${Math.round(luden)}`);
      }
      if (attackerStats.items.includes('3154')) { // Stormsurge (roughly 140-290 + 20% AP)
          let storm = 140 + (attackerLevel * 8) + (attackerStats.ap * 0.20);
          procMag += storm;
          procDetails.push(`Stormsurge: ${Math.round(storm)}`);
      }
      if (attackerStats.items.includes('3078')) { // Trinity Force
          // 200% base AD phys
          let triforce = (attackerStats.baseAd || 0) * 2.0;
          procPhys += triforce;
          procDetails.push(`Trinity: ${Math.round(triforce)}`);
      }
      if (attackerStats.items.includes('6662')) { // Iceborn Gauntlet
          // 100% base AD phys
          let iceborn = (attackerStats.baseAd || 0) * 1.0;
          procPhys += iceborn;
          procDetails.push(`Iceborn: ${Math.round(iceborn)}`);
      }

      if (procMag > 0 || procPhys > 0 || procTrue > 0) {
          let effArmor = Math.max(0, defenderStats.armor * (1 - (attackerStats.armorPenPct || 0)/100) - (attackerStats.lethality || 0));
          let physMitigation = (100 / (100 + effArmor));
          let mitigatedPhys = procPhys * physMitigation;

          let magicPenFlat = attackerStats.magicPenFlat || 0;
          let magicPenPct = attackerStats.magicPenPct || 0;
          let effMR = Math.max(0, defenderStats.mr * (1 - magicPenPct/100) - magicPenFlat);
          let magMitigation = (100 / (100 + effMR));
          let mitigatedMag = procMag * magMitigation;

          let totalMitigated = mitigatedPhys + mitigatedMag + procTrue;

          if (defenderActive['AlistarR']) totalMitigated *= 0.45;
          if (defenderActive['GarenW']) totalMitigated *= 0.70;

          totalData.physical += (mitigatedPhys * (totalMitigated / (mitigatedPhys + mitigatedMag + procTrue || 1)));
          totalData.magic += (mitigatedMag * (totalMitigated / (mitigatedPhys + mitigatedMag + procTrue || 1)));
          totalData.trueDamage += (procTrue * (totalMitigated / (mitigatedPhys + mitigatedMag + procTrue || 1)));

          let itemDetails = procDetails.join(', ');
          if (procPhys > 0) itemDetails += ` | Armor: ${Math.round(defenderStats.armor)} -> ${Math.round(effArmor)} (${Math.round((1-physMitigation)*100)}% reduced)`;
          if (procMag > 0) itemDetails += ` | MR: ${Math.round(defenderStats.mr)} -> ${Math.round(effMR)} (${Math.round((1-magMitigation)*100)}% reduced)`;

          totalData.log.push({ 
              key: 'ITEMS', 
              label: 'Item Procs', 
              damage: Math.round(totalMitigated), 
              type: procMag >= procPhys ? 'Magic' : 'Physical',
              details: itemDetails
          });
      }
  }

  return {
    total: totalData.physical + totalData.magic + totalData.trueDamage,
    physical: totalData.physical,
    magic: totalData.magic,
    true: totalData.trueDamage,
    log: totalData.log
  };
}
