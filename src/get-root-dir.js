'use strict';

const run = require('./run');

module.exports = function getSubDir() {
  let root = run('git rev-parse --show-toplevel').trim();
  return root;
};
