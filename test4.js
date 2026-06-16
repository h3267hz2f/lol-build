import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://www.op.gg/champions/ahri/build/mid');
    const text = await res.text();
    console.log("length:", text.length);
    console.log(text.match(/<script(.*?)<\/script>/gi)?.map(s => s.substring(0, 50)).join('\n'));
  } catch(e) { console.error(e); }
}
test();
