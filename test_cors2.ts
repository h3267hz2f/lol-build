const r = await fetch('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json');
for(let [k,v] of r.headers.entries()){
  console.log(k, v);
}
