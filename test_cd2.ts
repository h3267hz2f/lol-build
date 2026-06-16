fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/103.json')
  .then(r => r.json())
  .then(d => {
     console.log(Object.keys(d));
     console.log(d.spells[0]);
  })
  .catch(console.error);
