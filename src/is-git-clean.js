'use strict';

const run = require('./run');

module.exports = function isGitClean(options) {
  return !run('git status --porcelain', options);
};
