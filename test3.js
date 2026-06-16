import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://op.gg/champions/ahri/build/mid');
    const text = await res.text();
    const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) {
       console.log("Found NEXT_DATA, length:", match[1].length);
       const data = JSON.parse(match[1]);
       console.log("Core items:", data.props.pageProps.data.core_items);
    } else {
       console.log("No NEXT_DATA");
    }
  } catch(e) { console.error(e); }
}
test();
