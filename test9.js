import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://www.op.gg/champions/103/build/mid');
    const text = await res.text();
    // try finding [[{ items: 
    const matches = text.match(/items.*?\]/g);
    if(matches) console.log(matches.slice(0, 5).join('\n'));
    console.log("Winrate indices:", text.match(/win_rate/g)?.length);
  } catch(e) { console.error(e); }
}
test();
