const url = 'https://thingproxy.freeboard.io/fetch/https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json';
console.log(url);
const r = await fetch(url);
console.log(r.status);
console.log(r.headers.get('content-type'));
