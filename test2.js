import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://www.op.gg/champions/ahri/build/mid');
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch(e) { console.error(e); }
}
test();
