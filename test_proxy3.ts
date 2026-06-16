const url = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json')}`;
const r = await fetch(url);
console.log(r.status, r.headers.get('content-type'));
const text = await r.text();
console.log(text.substring(0, 50));
