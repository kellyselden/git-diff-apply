'use strict';

const run = require('./run');

module.exports = async function getRootDir(options) {
  let root = (await run('git rev-parse --show-toplevel', options)).trim();
  return root;
};
