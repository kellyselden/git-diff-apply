'use strict';

const run = require('./run');

module.exports = async function getSubDir() {
  let root = (await run('git rev-parse --show-toplevel')).trim();
  return root;
};
