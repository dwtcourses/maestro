const minimist = require("minimist");

const isVerbose = minimist(process.argv.slice(2), {
  boolean: ["verbose"],
  alias: {
    v: "verbose",
  },
}).verbose;

const log = (...args) => {
  if (isVerbose) {
    console.log(...args);
  }
};

module.exports = log;