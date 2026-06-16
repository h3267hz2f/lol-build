fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/item.json`))
  .then(res => res.json())
  .then(data => {
    Object.keys(data.data).forEach(id => {
      const item = data.data[id];
      if (id === '323110') {
        console.log(item);
      }
    });
  });
