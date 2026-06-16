const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://www.op.gg/api/v1.0/internal/bypass/meta/champions/103/core-items?hl=zh_CN&region=global&tier=platinum_plus&position=mid');
    console.log(JSON.stringify(res.data).substring(0, 500));
  } catch(e) { console.error(e.response ? e.response.statusText : e.message); }
}
test();
