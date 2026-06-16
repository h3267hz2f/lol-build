import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://www.op.gg/champions/103/build/mid');
    const text = await res.text();
    // find "core_items" or similar
    const coreIndex = text.indexOf('"core_items"');
    console.log(text.substring(Math.max(0, coreIndex - 100), coreIndex + 500));
  } catch(e) { console.error(e); }
}
test();
