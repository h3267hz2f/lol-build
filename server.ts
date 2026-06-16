import express from 'express';
import path from 'path';
import cors from 'cors';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

dotenv.config();

const turndownService = new TurndownService();
// Customize turndown to ignore SVGs or overly complex elements if needed
turndownService.remove(['script', 'style', 'noscript']);

async function fetchWithFallback(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 5000 // Short timeout for direct fetch
    });
    
    console.log(`Direct fetch successful for ${url}`);
    const $ = cheerio.load(response.data);
    
    // Cleanup non-content tags before converting to text
    $('script, style, noscript, iframe, svg, img').remove();
    let contentHtml = $('main').html() || $('#content').html() || $('body').html() || '';
    
    const markdown = turndownService.turndown(contentHtml);
    return markdown + '\n\n> *(Data fetched directly, saved Firecrawl credits)*';
    
  } catch (err: any) {
    const status = err.response?.status || 'Unknown';
    console.log(`[Direct Fetch Failed] ${url} - Status: ${status}. Falling back to Firecrawl API...`);
    
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error(`Direct fetch blocked by Cloudflare (Status: ${status}) and FIRECRAWL_API_KEY is missing.`);
    }

    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
      url: url,
      formats: ['markdown']
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return (response.data.data?.markdown || "Content retrieved but empty from Firecrawl") + '\n\n> *(Data fetched via Firecrawl API bypass)*';
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route to fetch Fandom Wiki data
  app.post('/api/fandom', async (req, res) => {
    try {
      const { champion } = req.body;
      const url = `https://leagueoflegends.fandom.com/wiki/${champion}/LoL`;
      const markdown = await fetchWithFallback(url);
      res.json({ data: { markdown } });
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      res.status(500).json({ error: msg });
    }
  });

  let arenaAugmentsCache: any = null;

  // API Route to fetch OP.GG builds using official OP.GG JSON API
  app.post('/api/opgg', async (req, res) => {
    try {
      const { champion, position, mode = 'ranked' } = req.body;
      const parsedPos = ['top', 'jungle', 'mid', 'adc', 'support', 'none'].includes(position) ? position : 'mid';
      
      // Need to find champion numeric key
      let numericKey = '';
      try {
          const ddres = await axios.get('https://ddragon.leagueoflegends.com/cdn/14.11.1/data/en_US/champion.json');
          for (let name in ddres.data.data) {
              if (ddres.data.data[name].id.toLowerCase() === champion.toLowerCase() || name.toLowerCase() === champion.toLowerCase()) {
                  numericKey = ddres.data.data[name].key;
                  break;
              }
          }
      } catch(e) {}
      if(!numericKey) throw new Error("Could not find numeric key for " + champion);

      let url = '';
      if (mode === 'aram') {
          url = `https://lol-api-champion.op.gg/api/global/champions/aram/${numericKey}/none`;
      } else if (mode === 'arena') {
          url = `https://lol-api-champion.op.gg/api/global/champions/arena/${numericKey}`;
      } else {
          url = `https://lol-api-champion.op.gg/api/global/champions/ranked/${numericKey}/${parsedPos === 'none' ? 'mid' : parsedPos}`;
      }
      
      const response = await axios.get(url);
      const data = response.data.data;
      if (!data) throw new Error("Empty data returned from OP.GG API");

      const result: any = {
         championId: champion,
         starterItems: (data.starter_items || []).map((si: any) => ({
             items: si.ids.map(String),
             pickRate: si.pick_rate ? parseFloat((si.pick_rate * 100).toFixed(2)) : 0,
             winRate: si.play ? parseFloat(((si.win / si.play) * 100).toFixed(2)) : 0
         })),
         summonerSpells: (data.summoner_spells || []).map((ss: any) => ({
             spells: ss.ids.map(String),
             pickRate: ss.pick_rate ? parseFloat((ss.pick_rate * 100).toFixed(2)) : 0,
             winRate: ss.play ? parseFloat(((ss.win / ss.play) * 100).toFixed(2)) : 0
         })),
         coreBuilds: (data.core_items || []).map((ci: any) => ({
             items: ci.ids.map(String),
             pickRate: ci.pick_rate ? parseFloat((ci.pick_rate * 100).toFixed(2)) : 0,
             winRate: ci.play ? parseFloat(((ci.win / ci.play) * 100).toFixed(2)) : 0
         })),
         boots: (data.boots || []).map((b: any) => ({
             id: String(b.ids[0]),
             pickRate: b.pick_rate ? parseFloat((b.pick_rate * 100).toFixed(2)) : 0,
             winRate: b.play ? parseFloat(((b.win / b.play) * 100).toFixed(2)) : 0
         })),
         skillOrder: (data.skill_masteries || []).map((sm: any) => ({
             order: sm.builds?.[0]?.order || sm.ids,
             pickRate: sm.pick_rate ? parseFloat((sm.pick_rate * 100).toFixed(2)) : 0,
             winRate: sm.play ? parseFloat(((sm.win / sm.play) * 100).toFixed(2)) : 0
         })),
         runes: (data.runes || []).map((r: any) => ({
             primaryTree: String(r.primary_page_id),
             secondaryTree: String(r.secondary_page_id),
             perks: [...(r.primary_rune_ids || []), ...(r.secondary_rune_ids || []), ...(r.stat_mod_ids || [])].map(String),
             pickRate: r.pick_rate ? parseFloat((r.pick_rate * 100).toFixed(2)) : 0,
             winRate: r.play ? parseFloat(((r.win / r.play) * 100).toFixed(2)) : 0
         })),
         augments: await Promise.all((data.augment_group || []).map(async (group: any) => {
             if (mode === 'arena' && !arenaAugmentsCache) {
                 try {
                     const res = await axios.get('https://raw.communitydragon.org/latest/cdragon/arena/zh_cn.json');
                     const map: Record<string, any> = {};
                     if (res.data && res.data.augments) {
                         for (const aug of res.data.augments) {
                             if (aug && aug.id) map[aug.id] = aug;
                         }
                     }
                     arenaAugmentsCache = map;
                 } catch (e) {
                     console.warn("cdrag fail", e);
                     arenaAugmentsCache = {};
                 }
             }
             return {
                 rarity: group.rarity,
                 augments: (group.augments || []).map((ag: any) => {
                     const cdAug = arenaAugmentsCache ? arenaAugmentsCache[ag.id] : null;
                     let iconUrl = '';
                     if (cdAug && cdAug.iconSmall) {
                         iconUrl = 'https://raw.communitydragon.org/latest/game/' + cdAug.iconSmall.toLowerCase();
                     }
                     return {
                         id: String(ag.id),
                         name: cdAug ? cdAug.name : `Augment ${ag.id}`,
                         iconUrl: iconUrl,
                         pickRate: ag.pick_rate ? parseFloat((ag.pick_rate * 100).toFixed(2)) : 0,
                         winRate: ag.play ? parseFloat(((ag.win / ag.play) * 100).toFixed(2)) : 0
                     };
                 })
             };
         })),
         counters: { weakAgainst: [], strongAgainst: [] },
         winRate: data.summary?.average_stats?.win_rate ? parseFloat((data.summary.average_stats.win_rate * 100).toFixed(2)) : 0,
         pickRate: data.summary?.average_stats?.pick_rate ? parseFloat((data.summary.average_stats.pick_rate * 100).toFixed(2)) : 0,
         banRate: data.summary?.average_stats?.ban_rate ? parseFloat((data.summary.average_stats.ban_rate * 100).toFixed(2)) : 0,
         kda: data.summary?.average_stats?.kda ? parseFloat(data.summary.average_stats.kda.toFixed(2)) : 0,
         tier: data.summary?.average_stats?.tier || 'N/A',
         trends: data.trends,
         gameLengths: data.game_lengths
      };

      result.singleItems = (data.last_items || []).map((li: any) => ({
          id: String(li.ids[0]),
          winRate: li.play ? parseFloat(((li.win / li.play) * 100).toFixed(2)) : 0,
          games: li.play || 0
      }));

      (data.counters || []).forEach((c: any) => {
          const wr = c.play ? parseFloat(((c.win / c.play) * 100).toFixed(2)) : 0;
          const obj = { championId: String(c.champion_id), winRate: wr, games: c.play };
          if (wr < 50) {
              result.counters.weakAgainst.push(obj);
          } else {
              result.counters.strongAgainst.push(obj);
          }
      });

      res.json(result);
    } catch (error: any) {
      console.error("OPGG API Error:", error.message);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // API Route to fetch Meraki Champion JSON
  app.post('/api/meraki', async (req, res) => {
    try {
      const { championId } = req.body;
      const url = `https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${championId}.json`;
      const response = await axios.get(url);
      res.json(response.data);
    } catch (error: any) {
      console.error(`Meraki proxy error for ${req.body.championId}:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Middleware for SPA fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
