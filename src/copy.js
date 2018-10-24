'use strict';

const fs = require('fs-extra');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = function copy(from, to) {
  if (debug.enabled) {
    debug(require('fs').readdirSync(from));
  }

  debug(`copy ${from} ${to}`);
  return fs.copy(from, to, {
    filter(src) {
      return copyRegex.test(src);
    }
  });
};
