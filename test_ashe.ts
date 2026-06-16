import { calculateComboDamage } from './src/utils/damage';

async function run() {
  const data = await fetch('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ashe.json').then(r=>r.json());
  const attackerStats = {
      ad: 100, baseAd: 60, ap: 0, crit: 0, armorPenPct: 0, lethality: 0, magicPenPct: 0, magicPenFlat: 0
  };
  const defenderStats = {
      armor: 50, mr: 50, hp: 1000
  };
  
  const result = calculateComboDamage('Q W E A', attackerStats, defenderStats, data, 18, {}, {});
  console.log(JSON.stringify(result, null, 2));
}

run();
