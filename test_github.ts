const r = await fetch('https://raw.githubusercontent.com/meraki-analytics/lolcat-data/master/champions.json', {method: 'OPTIONS'});
console.log(r.status);
for(let [k,v] of r.headers.entries()){
  console.log(k, v);
}
