import React from "react";
import { connect } from "react-redux";
import games from "../data/games";
import Map from "./Map";
import Svg from "../Svg";
import Title from "../Title";
import HexContext from "../context/HexContext";
import GameContext from "../context/GameContext";
import { equalPages, maxPages } from "../util";
import { Redirect } from "react-router-dom";

import VariationSelect from "../nav/VariationSelect";
import { getMapData } from "./util";

import map from "ramda/es/map";
import prop from "ramda/es/prop";

import "./MapPaginated.css";

const MapPaginated = ({ match, coords, pagination, paper }) => {
  let game = games[match.params.game];
  let splitPages = pagination === "max" ? maxPages : equalPages;

  if(game.info.paginated === false && match.params.variation) {
    return <Redirect to={`/${match.params.game}/map/${match.params.variation}`} />;
  } else if (game.info.paginated === false) {
    return <Redirect to={`/${match.params.game}/map`} />;
  } else if (match.params.variation && !Array.isArray(game.map)) {
    return <Redirect to={`/${match.params.game}/map-paginated`} />;
  } else if (!match.params.variation && Array.isArray(game.map)) {
    return <Redirect to={`/${match.params.game}/map-paginated/0`} />;
  }

  let variation = Number(match.params.variation) || 0;
  let data = getMapData(game, coords, variation);

  let pageWidth = paper.width - 75;
  let pageHeight = paper.height - 75;

  if (data.map.print === "landscape") {
    let tmp = pageWidth;
    pageWidth = pageHeight;
    pageHeight = tmp;
  }

  let y = -25; // Start with room for margins
  let mapPages = map(height => {
    let x = -25; // Start with room for margins
    let pages = map(width => {
      let page = (
        <div
          key={`page-${x}-${y}`}
          className="cutlines"
          style={{
            width: `${(width + 25) / 100}in`,
            height: `${(height + 25) / 100}in`,
            float: "none",
            margin: "auto auto"
          }}
        >
          <div classname="mappage">
            <svg
              style={{
                width: `${(width + 25) / 100}in`,
                height: `${(height + 25) / 100}in`
              }}
              viewBox={`${x - 12.5} ${y - 12.5} ${width + 25} ${height + 25}`}
            >
              <use href={`#${game.info.abbrev || game.info.title}_map`} />
            </svg>
          </div>
        </div>
      );

      x = x + width;
      return page;
    }, splitPages(data.totalWidth + 50, pageWidth));

    y = y + height;
    return pages;
  }, splitPages(data.totalHeight + 50, pageHeight));

  let defs = (
    <g id={`${game.info.abbrev || game.info.title}_map`}>
      <Title game={game} variation={variation} />
      <Map game={game} variation={variation} />
    </g>
  );

  let variationSelect = null;
  if(Array.isArray(game.map)) {
    let variations = map(prop("name"), game.map);
    variationSelect = (
      <VariationSelect base={`/${match.params.game}/map-paginated/`}
                       variations={variations} />
    );
  }

  return (
    <GameContext.Provider value={match.params.game}>
    <HexContext.Provider
      value={{
        width: game.info.width,
        rotation: game.info.orientation === "horizontal" ? 0 : 90
      }}
    >
      <div className="PrintNotes">
        <div>
          {variationSelect}
          <p>
            This map is meant to be printed in <b>{data.map.print || "portrait"}</b>{" "}
            mode
          </p>
        </div>
      </div>
      <Svg className="FullMap" defs={defs} />
      {mapPages}
      <style>{`@media print {@page {size: ${data.map.print === "landscape" ? "11in 8.5in" : "8.5in 11in"};}}`}</style>
    </HexContext.Provider>
    </GameContext.Provider>
  );
};

const mapStateToProps = state => ({
  coords: state.config.coords,
  pagination: state.config.pagination,
  paper: state.config.paper
});

export default connect(mapStateToProps)(MapPaginated);