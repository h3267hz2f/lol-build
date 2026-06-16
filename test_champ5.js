fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`))
  .then(res => res.json())
  .then(data => {
    Object.keys(data.data).forEach(id => {
      const adl = data.data[id].stats.attackdamageperlevel;
      if (adl > 0) {
        console.log("NON-ZERO ADL:", id, adl);
      }
    });
  });
