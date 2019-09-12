'use strict';

const utils = require("./utils");

const getSrc = function(url) {
  return new Promise(async ok => {
    const ret = await utils.GetPageFromBlockchain(url.substr(7), 'tBTC');
    url = "data:text/html;base64," + ret;
    ok(url);
  });
}

const browser = new navigation({
  defaultFavicons: true,
  getSrc: getSrc
});
