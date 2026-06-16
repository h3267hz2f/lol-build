fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/item.json`))
  .then(res => res.json())
  .then(data => {
    console.log(data.data['3086'].stats); // Zeal
  });
