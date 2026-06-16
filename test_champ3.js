fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(res => res.json())
  .then(versions => fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/championFull.json`))
  .then(res => res.json())
  .then(data => {
    console.log("Ahri", data.data['Ahri'].stats.attackdamageperlevel);
    console.log("Jinx", data.data['Jinx'].stats.attackdamageperlevel);
    console.log("Ashe", data.data['Ashe'].stats.attackdamageperlevel);
  });
