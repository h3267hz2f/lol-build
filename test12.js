import fetch from 'node-fetch';
import fs from 'fs';

async function test() {
  try {
    const res = await fetch('https://www.metasrc.com/lol/champion/103/build');
    const text = await res.text();
    fs.writeFileSync('metasrc.html', text);
  } catch(e) { console.error(e); }
}
test();
