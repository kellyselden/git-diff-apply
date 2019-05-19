'use strict';

const fs = require('fs-extra');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

module.exports = async function copy(from, to) {
  if (debug.enabled) {
    debug(await fs.readdir(from));
  }

  debug(`copy ${from} ${to}`);
  await fs.copy(from, to, {
    filter(src) {
      return copyRegex.test(src);
    }
  });
};
