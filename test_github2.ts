const r = await fetch('https://raw.githubusercontent.com/meraki-analytics/lolcat-data/master/champions/Ahri.json');
console.log(r.status);
console.log(await r.text());
