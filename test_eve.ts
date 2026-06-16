import { calculateComboDamage } from './src/utils/damage';

async function testEvelynn() {
   const eveData = await fetch('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Evelynn.json').then(r=>r.json());
   
   const attackerStats = {
     ad: 60,
     baseAd: 60,
     hp: 600,
     baseHp: 600,
     ap: 100,
     lethality: 0,
     armorPenPct: 0,
     magicPenFlat: 10,
     magicPenPct: 0,
     crit: 0,
     critDmgMod: 0,
     armor: 30,
     mr: 30
   };
   
   const defenderStats = {
     armor: 40,
     mr: 40,
     hp: 1000
   };
   
   const res = calculateComboDamage("E Q W A R", attackerStats, defenderStats, eveData, 18, {}, {});
   console.log(JSON.stringify(res, null, 2));
}

testEvelynn();
