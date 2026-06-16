export type PageType = 'simulator' | 'match-history' | 'ai-coach' | 'settings';

export interface Spell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  cooldown: number[];
  cost: number[];
  // If we need more info about ratios we can parse tooltip, unfortunately DDragon isn't great here
}

export interface Champion {
  id: string;
  key?: string;
  name: string;
  title: string;
  tags: string[];
  image: string;
  spells?: Spell[];
  passive?: { name: string; description: string; image: { full: string } };
  stats: {
    hp: number;
    hpperlevel: number;
    mp: number;
    mpperlevel: number;
    movespeed: number;
    armor: number;
    armorperlevel: number;
    spellblock: number;
    spellblockperlevel: number;
    attackrange: number;
    hpregen: number;
    hpregenperlevel: number;
    mpregen: number;
    mpregenperlevel: number;
    crit: number;
    critperlevel: number;
    attackdamage: number;
    attackdamageperlevel: number;
    attackspeedperlevel: number;
    attackspeed: number;
  };
}

export interface Item {
  id: string;
  name: string;
  plaintext: string;
  description?: string;
  tags?: string[];
  image: string;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  depth?: number;
  stats: {
    FlatHPPoolMod?: number;
    FlatMPPoolMod?: number;
    PercentMovementSpeedMod?: number;
    FlatArmorMod?: number;
    FlatSpellBlockMod?: number;
    FlatPhysicalDamageMod?: number;
    FlatMagicDamageMod?: number;
    PercentAttackSpeedMod?: number;
    FlatCritChanceMod?: number;
    [key: string]: number | undefined;
  };
}

export interface MatchState {
  level: number;
  items: Item[];
}
