fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/103.json')
  .then(r => console.log(r.status, r.headers.get('access-control-allow-origin')))
  .catch(console.error);
