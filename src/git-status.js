'use strict';

const { runWithSpawn } = require('./run');

async function gitStatus(options) {
  return await runWithSpawn('git', ['status', '--porcelain'], options);
}

async function isGitClean(options) {
  return !await gitStatus(options);
}

module.exports = gitStatus;
module.exports.isGitClean = isGitClean;
