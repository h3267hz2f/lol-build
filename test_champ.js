fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`))
  .then(res => res.json())
  .then(data => {
    console.log(data.data['Ashe'].stats);
  });
