'use strict';

const run = require('./run');

module.exports = async function getRootDir() {
  let root = (await run('git rev-parse --show-toplevel')).trim();
  return root;
};
