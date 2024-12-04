const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  chrome: {
    skipDownload: false,
  },
  // Download Firefox (default `skipDownload: true`).
  firefox: {
    skipDownload: false,
  },

  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
