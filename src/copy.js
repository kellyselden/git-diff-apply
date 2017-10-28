'use strict';

const denodeify = require('denodeify');
const ncp = denodeify(require('ncp'));
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = function copy(tmpDir) {
  if (debug.enabled) {
    debug(require('fs').readdirSync(tmpDir));
  }

  debug(`copy ${tmpDir} ${process.cwd()}`);
  return ncp(tmpDir, '.', {
    filter: copyRegex
  });
};
