fetch('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json')
  .then(r => console.log(r.headers.get('access-control-allow-origin')))
  .catch(console.error);
