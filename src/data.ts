import { Champion, Item } from './types';

export const CHAMPIONS: Champion[] = [
  {
    id: "Ahri",
    name: "Ahri",
    title: "the Nine-Tailed Fox",
    tags: ["Mage", "Assassin"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Ahri.png",
    stats: {
      hp: 590, hpperlevel: 104, mp: 418, mpperlevel: 25, movespeed: 330,
      armor: 21, armorperlevel: 4.7, spellblock: 30, spellblockperlevel: 1.3,
      attackrange: 550, hpregen: 2.5, hpregenperlevel: 0.6, mpregen: 8,
      mpregenperlevel: 0.8, crit: 0, critperlevel: 0,
      attackdamage: 53, attackdamageperlevel: 3, attackspeedperlevel: 2, attackspeed: 0.668
    }
  },
  {
    id: "Yasuo",
    name: "Yasuo",
    title: "the Unforgiven",
    tags: ["Fighter", "Assassin"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Yasuo.png",
    stats: {
      hp: 590, hpperlevel: 101, mp: 100, mpperlevel: 0, movespeed: 345,
      armor: 30, armorperlevel: 4.6, spellblock: 32, spellblockperlevel: 1.25,
      attackrange: 175, hpregen: 6.5, hpregenperlevel: 0.9, mpregen: 0,
      mpregenperlevel: 0, crit: 0, critperlevel: 0,
      attackdamage: 60, attackdamageperlevel: 3.2, attackspeedperlevel: 3.5, attackspeed: 0.697
    }
  },
  {
    id: "Jinx",
    name: "Jinx",
    title: "the Loose Cannon",
    tags: ["Marksman"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Jinx.png",
    stats: {
      hp: 630, hpperlevel: 105, mp: 260, mpperlevel: 50, movespeed: 325,
      armor: 26, armorperlevel: 4.7, spellblock: 30, spellblockperlevel: 1.3,
      attackrange: 525, hpregen: 3.75, hpregenperlevel: 0.5, mpregen: 6.7,
      mpregenperlevel: 1, crit: 0, critperlevel: 0,
      attackdamage: 59, attackdamageperlevel: 3.15, attackspeedperlevel: 1.36, attackspeed: 0.625
    }
  }
];

export const ITEMS: Item[] = [
  {
    id: "3031", name: "Infinity Edge", plaintext: "Massively enhances critical strikes",
    description: "", tags: ["Damage", "CriticalStrike"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/3031.png",
    gold: { base: 625, total: 3300, sell: 2310, purchasable: true },
    stats: { FlatPhysicalDamageMod: 65, FlatCritChanceMod: 0.2 }
  },
  {
    id: "3089", name: "Rabadon's Deathcap", plaintext: "Massively increases Ability Power",
    description: "", tags: ["SpellDamage"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/3089.png",
    gold: { base: 1200, total: 3600, sell: 2520, purchasable: true },
    stats: { FlatMagicDamageMod: 140 }
  },
  {
    id: "3020", name: "Sorcerer's Shoes", plaintext: "Enhances Magic Penetration and Movement Speed",
    description: "", tags: ["Boots", "MagicPenetration"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/3020.png",
    gold: { base: 800, total: 1100, sell: 770, purchasable: true },
    stats: { FlatMovementSpeedMod: 45 } // Notice we use flat move speed though it's custom. We map it later.
  },
  {
    id: "3006", name: "Berserker's Greaves", plaintext: "Enhances Attack Speed and Movement Speed",
    description: "", tags: ["Boots", "AttackSpeed"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/3006.png",
    gold: { base: 500, total: 1100, sell: 770, purchasable: true },
    stats: { PercentAttackSpeedMod: 0.35, FlatMovementSpeedMod: 45 }
  },
  {
    id: "3071", name: "Black Cleaver", plaintext: "Physical attacks reduce enemy Armor",
    description: "", tags: ["Damage", "Health", "ArmorPenetration"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/3071.png",
    gold: { base: 400, total: 3000, sell: 2100, purchasable: true },
    stats: { FlatHPPoolMod: 400, FlatPhysicalDamageMod: 55 }
  },
  {
    id: "6672", name: "Kraken Slayer", plaintext: "Every third attack deals bonus true damage",
    description: "", tags: ["Damage", "AttackSpeed", "CriticalStrike"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/6672.png",
    gold: { base: 400, total: 3100, sell: 2170, purchasable: true },
    stats: { FlatPhysicalDamageMod: 40, PercentAttackSpeedMod: 0.20, FlatCritChanceMod: 0.2 }
  }
];
