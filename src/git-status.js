'use strict';

const run = require('./run');

function gitStatus(options) {
  return run('git status --porcelain', options);
}

function isGitClean(options) {
  return !gitStatus(options);
}

module.exports = gitStatus;
module.exports.isGitClean = isGitClean;
