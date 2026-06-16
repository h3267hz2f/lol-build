import fetch from 'node-fetch';
import fs from 'fs';

async function test() {
  try {
    const res = await fetch('https://www.op.gg/champions/103/build/mid');
    const text = await res.text();
    fs.writeFileSync('ahri.html', text);
  } catch(e) { console.error(e); }
}
test();
