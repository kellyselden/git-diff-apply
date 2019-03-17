'use strict';

const path = require('path');
const fs = require('fs-extra');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = function moveAll(from, to) {
  if (debug.enabled) {
    debug(require('fs').readdirSync(from));
  }

  debug(`moveAll ${from} ${to}`);
  return fs.readdir(from).then(files => {
    return Promise.all(files.filter(file => {
      return copyRegex.test(file);
    }).map(file => {
      return fs.move(
        path.join(from, file),
        path.join(to, file)
      );
    }));
  });
};
