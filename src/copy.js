'use strict';

const co = require('co');
const fs = require('fs-extra');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = co.wrap(function* copy(from, to) {
  if (debug.enabled) {
    debug(yield fs.readdir(from));
  }

  debug(`copy ${from} ${to}`);
  yield fs.copy(from, to, {
    filter(src) {
      return copyRegex.test(src);
    }
  });
});
