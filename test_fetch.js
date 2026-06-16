const https = require('https');
https.get('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json', (res)=>{ console.log(res.headers); });
