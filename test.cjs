const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const res = await axios.get('https://www.op.gg/champions/ahri/build/mid');
    console.log(res.data.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }
}
test();
