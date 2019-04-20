import append from "ramda/es/append";
import chain from "ramda/es/chain";
import compose from "ramda/es/compose";
import curry from "ramda/es/curry";
import drop from "ramda/es/drop";
import find from "ramda/es/find";
import isEmpty from "ramda/es/isEmpty";
import join from "ramda/es/join";
import lte from "ramda/es/lte";
import map from "ramda/es/map";
import prepend from "ramda/es/prepend";
import propOr from "ramda/es/propOr";
import reverse from "ramda/es/reverse";
import take from "ramda/es/take";

export const groupsOf = curry(function group(n, list) {
  return isEmpty(list)
    ? []
    : prepend(take(n, list), group(n, drop(n, list)));
});

export const linear = curry((percent, p1, p2) => [
  p1[0] * percent + p2[0] * (1.0 - percent),
  p1[1] * percent + p2[1] * (1.0 - percent)
]);

export const midpoint = linear(0.5);

export const pointsToString = compose(
  join(" "),
  map(join(","))
);

export const trackType = track => {
  if (track.end === undefined && track.start === undefined) {
    return null;
  } else if (track.end === undefined) {
    return "city";
  } else if (track.start === undefined) {
    return "stop";
  } else {
    let diff = Math.abs(track.start - track.end);
    if (diff > 3) {
      diff = Math.abs(6 - diff);
    }

    switch (diff) {
      case 1:
        return "sharp";
      case 2:
        return "gentle";
      case 3:
        return "straight";
      default:
        return "city";
    }
  }
};

export const fillArray = curry((getNumber, array) => {
  return chain(a => Array(getNumber(a)).fill(a), array);
});

export const marketColor = curry((limits, value) => {
  return propOr(
    "plain",
    "color",
    find(limit => lte(value, limit.value), reverse(limits))
  );
});

export const equalPages = (total, page) => {
  let pages = Math.ceil(total/page);

  let result = new Array(pages);
  result.fill(total/pages);
  return result;
};

export const maxPages = (total, page) => {
  let helper = (total, page, result) => {
    if(total <= page) {
      return append(total, result);
    } else if(total <= (2 * page)) {
      let width = total * 0.5;
      return prepend(width, append(width, result));
    } else {
      return helper(total - page, page, append(page, result));
    }
  };

  return helper(total, page, []);
};
