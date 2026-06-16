fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/item.json`))
  .then(res => res.json())
  .then(data => {
    Object.keys(data.data).forEach(id => {
      const item = data.data[id];
      if (item.name.includes("Frozen Heart")) {
        console.log(`ID: ${id}, Name: ${item.name}, Maps: ${JSON.stringify(item.maps)}, Gold: ${JSON.stringify(item.gold)}, requiredAlly: ${item.requiredAlly}, hideFromAll: ${item.hideFromAll}`);
      }
    });
  });
