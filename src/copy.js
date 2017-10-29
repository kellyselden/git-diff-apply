'use strict';

const denodeify = require('denodeify');
const ncp = denodeify(require('ncp'));
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = function copy(from, to) {
  if (debug.enabled) {
    debug(require('fs').readdirSync(from));
  }

  debug(`copy ${from} ${to}`);
  return ncp(from, to, {
    filter: copyRegex
  });
};
