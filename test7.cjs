const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://lolalytics.com/lol/ahri/build/');
    console.log(res.data.substring(0, 500));
  } catch(e) { console.error(e.response ? e.response.statusText : e.message); }
}
test();
