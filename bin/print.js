const R = require('ramda');
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

require("@babel/register");

const util = require('../src/render/util');
const setup = util.setup;

setup();

let games = [process.argv[2] || "1830"];
if(process.argv[2] === "all") {
  games = R.keys(require("../src/data/games").default);
}

const app = express();

app.use(express.static(path.join(process.cwd(), 'build')));

app.get('/*', function(req, res) {
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

const server = app.listen(9000);

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();

  for(let g=0;g<games.length;g++) {
    let game = games[g];

    // Create the output folder
    try {
      fs.mkdirSync(`./build/render/${game}`);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    let items = ['background', 'cards', 'charters', 'market', 'market-paginated', 'map', 'map-paginated', 'tiles', 'tokens'];

    let gameDef = require(`../src/data/games/${game}`).default;

    for(let i=0;i<items.length;i++) {
      let item = items[i];

      if(item === "map-paginated" && gameDef.info.paginated === false) continue;
      if(item === "market" && gameDef.stock.paginated === true) item = 'market-paginated';

      console.log("Printing " + game + "/" + item);
      await page.goto(`http://localhost:9000/${game}/${item}`, {waitUntil: 'networkidle0'});
      await page.pdf({path: `build/render/${game}/${item}.pdf`, scale: 1.0, preferCSSPageSize: true});
    }
  }

  await browser.close();

  await server.close();
})();
