const R = require('ramda');
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

require("@babel/register");

const gutil = require('../src/util').default;
const util = require('../src/render/util');
const setup = util.setup;
const setupB18 = util.setupB18;

const config = require('../src/config.json');
const mutil = require('../src/market-utils');

const capitalize = R.compose(
    R.join(''),
    R.juxt([R.compose(R.toUpper, R.head), R.tail])
);

setup();

let bname = process.argv[2];
let version = process.argv[3];
let author = process.argv[4];

let game = require(`../src/data/games/${bname}`).default;
let tiles = require('../src/data/tiles').default;

// Startup server
const app = express();

app.use(express.static(path.join(process.cwd(), 'build')));

app.get('/*', function(req, res) {
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

const server = app.listen(9000);

const getTile = id => {
  if(!tiles[id]) {
    id = id.split("|")[0];
  }

  let tile = tiles[id];
  tile.id = id;
  return tile;
};

let json = {
  bname,
  version,
  author,
  board: {
    imgLoc: `images/${bname}-${version}/Map.png`,
    xStart: 50,
    xStep: 50,
    yStart: 58,
    yStep: 87
  },
  market: {
    imgLoc: `images/${bname}-${version}/Market.png`,
    xStart: 50,
    xStep: 50,
    yStart: 58,
    yStep: 87
  },
  tray: [],
  links: [{
    link_name: `${bname} on BGG`,
    link_url: game.links.bgg
  },{
    link_name: `Rules`,
    link_url: game.links.rules
  }]
};

setupB18(bname, version);
let counts = R.compose(
  R.countBy(R.identity),
  R.map(R.prop("color")),
  R.uniq,
  R.map(id => tiles[id] || tiles[id.split("|")[0]])
)(R.keys(game.tiles));
let colors = R.keys(counts);

for(let j=0;j<colors.length;j++) {
  let color = colors[j];

  let tray = {
    type: "tile",
    tName: `${capitalize(color)} Tiles`,
    imgLoc: `images/${bname}-${version}/${capitalize(color)}.png`,
    xStart: 0,
    yStart: 0,
    xStep: 150,
    yStep: 150,
    xSize: game.info.orientation === "horizontal" ? 116 : 100,
    ySize: game.info.orientation === "horizontal" ? 100 : 116,
    tile: []
  };

  let tiles = R.compose(R.uniq,
                        R.filter(R.propEq("color", color)),
                        R.map(getTile))(R.keys(game.tiles));

  R.mapObjIndexed((dups, id) => {
    let tile = getTile(id);
    if (tile.color !== color) return;

    // Merge tile with game tile
    if(R.is(Object,game.tiles[id])) {
      tile = {...tile, ...game.tiles[id]};
    }

    // Figure out rotations
    let rots = 6;
    if(R.is(Number, tile.rotations)) {
      rots = tile.rotations;
    } else if(R.is(Array, tile.rotations)) {
      rots = tile.rotations.length;
    }

    tray.tile.push({
      rots,
      dups
    });
  }, game.tiles);

  json.tray.push(tray);
}

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();

  // Board 18 Tile
  let counts = R.compose(
    R.countBy(R.identity),
    R.map(R.prop("color")),
    R.uniq,
    R.map(id => tiles[id] || tiles[id.split("|")[0]])
  )(R.keys(game.tiles));
  let colors = R.keys(counts);

  let hexWidth = game.info.width;
  let edge = hexWidth * gutil.HEX_RATIO;
  let halfHexWidth = 0.5 * hexWidth;

  let map = Array.isArray(game.map) ? game.map[0] : game.map;
  let hexes = map.hexes;
  if (map.copy !== undefined) {
    hexes = R.concat(game.map[map.copy].hexes, hexes);
  }
  let maxX = gutil.maxMapX(hexes);
  let maxY = gutil.maxMapY(hexes);

  let totalWidth =
      100 + (game.info.extraTotalWidth || 0) + halfHexWidth * (maxX + 1);
  let totalHeight =
      100 +
      (game.info.extraTotalHeight || 0) +
      (1.5 * (maxY - 1) * edge + 2 * edge);

  if (game.info.orientation === "horizontal") {
    let tmp = totalWidth;
    totalWidth = totalHeight;
    totalHeight = tmp;
  }

  let printWidth = 200 + Math.ceil(totalWidth);
  let printHeight = 150 + Math.ceil(totalHeight);

  console.log(`Printing ${bname}/b18/${bname}-${version}/Map.png`);
  await page.goto(`http://localhost:9000/${bname}/map`, {waitUntil: 'networkidle2'});
  await page.addStyleTag({ content: 'nav {display:none;} .LegalNotes {display:none;} .PrintNotes {display:none;}'});
  await page.setViewport({ width: printWidth, height: printHeight });
  await page.screenshot({ path: `build/render/${bname}/b18/${bname}-${version}/Map.png`});

  console.log(`Printing ${bname}/b18/${bname}-${version}/Market.png`);
  let marketWidth = config.stock.cell.width * mutil.width(game.stock.market);
  let marketHeight = 50 + (config.stock.cell.height * mutil.height(game.stock.market));
  await page.goto(`http://localhost:9000/${bname}/market`, {waitUntil: 'networkidle2'});
  await page.addStyleTag({ content: 'nav {display:none;} .LegalNotes {display:none;} .PrintNotes {display:none;}'});
  await page.setViewport({ width: marketWidth + 1, height: marketHeight + 1 });
  await page.screenshot({ path: `build/render/${bname}/b18/${bname}-${version}/Market.png`});

  for(let j=0;j<colors.length;j++) {
    let color = colors[j];

    let width = counts[color] * 150;
    let height = 900;

    console.log(`Printing ${bname}/b18/${bname}-${version}/${capitalize(color)}.png`);
    await page.goto(`http://localhost:9000/${bname}/b18-tiles-${color}`, {waitUntil: 'networkidle2'});
    await page.addStyleTag({ content: 'nav {display:none;} footer {display:none;} .LegalNotes {display:none;} .PrintNotes {display:none;}'});
    await page.setViewport({ width, height });
    await page.screenshot({ path: `build/render/${bname}/b18/${bname}-${version}/${capitalize(color)}.png`, omitBackground: true });
  }
  await browser.close();

  await server.close();

  console.log(`Writing ${bname}/b18/${bname}-${version}.json"`);
  fs.writeFileSync(`build/render/${bname}/b18/${bname}-${version}.json`, JSON.stringify(json, null, 2));
})();
