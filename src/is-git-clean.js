'use strict';

const run = require('./run');

module.exports = function isGitClean() {
  return !run('git status --porcelain');
};
