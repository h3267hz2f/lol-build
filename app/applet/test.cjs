const https = require('https');
https.get('https://ax.lolalytics.com/tierlist/1/v2/current/global/all/platinum/overview/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 500)));
}).on('error', console.error);
