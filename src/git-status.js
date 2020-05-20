'use strict';

const { spawn } = require('./run');

async function gitStatus(options) {
  return await spawn('git', ['status', '--porcelain'], options);
}

async function isGitClean(options) {
  return !await gitStatus(options);
}

module.exports = gitStatus;
module.exports.isGitClean = isGitClean;
