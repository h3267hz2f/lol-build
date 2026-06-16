import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://www.metasrc.com/lol/champion/103/build');
    const text = await res.text();
    console.log(text.match(/_data=\{(.*?)\};/)?.[1]?.substring(0, 500));
  } catch(e) { console.error(e); }
}
test();
