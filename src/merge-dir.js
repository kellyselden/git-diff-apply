'use strict';

const co = require('co');
const fs = require('fs-extra');
const move = require('fs-move');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = co.wrap(function* mergeDir(from, to) {
  if (debug.enabled) {
    debug(yield fs.readdir(from));
  }

  debug(`mergeDir ${from} ${to}`);
  yield move(from, to, {
    merge: true,
    overwrite: true,
    filter(fromFile, toFile) {
      debug(`from ${fromFile}`);
      debug(`to ${toFile}`);

      return copyRegex.test(fromFile);
    }
  });
});
