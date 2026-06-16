import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/opgg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ champion: 'ahri' })
    });
    const data = (await res.json()) as any;
    console.log(data?.data?.markdown?.substring(0, 1000));
  } catch (e) {
    console.error(e);
  }
}
test();
