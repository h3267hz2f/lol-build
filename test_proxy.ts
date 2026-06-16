const url = `https://corsproxy.io/?url=${encodeURIComponent('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json')}`;
const r = await fetch(url);
console.log(r.status, r.headers.get('content-type'));
const text = await r.text();
console.log(text.substring(0, 50));
