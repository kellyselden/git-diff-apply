'use strict';

const co = require('co');
const fs = require('fs-extra');
const klaw = require('klaw');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');
const moveFile = require('move-file');

module.exports = co.wrap(function* mergeDir(from, to) {
  if (debug.enabled) {
    debug(yield fs.readdir(from));
  }

  debug(`mergeDir ${from} ${to}`);
  yield new Promise((resolve, reject) => {
    let promises = [];
    klaw(from, {
      preserveSymlinks: true,
      filter(src) {
        return copyRegex.test(src);
      }
    }).on('data', item => {
      let fromFile = item.path;
      let toFile = to + item.path.substr(from.length);
      debug(`from ${fromFile}`);
      debug(`to ${toFile}`);

      let promise;
      if (item.stats.isDirectory()) {
        promise = fs.ensureDir(toFile);
      } else {
        // `fs.move` doesn't handle broken symlinks
        // `fs.rename` doesn't work cross filesystems
        promise = moveFile(fromFile, toFile);
      }
      promises.push(promise);
    }).on('error', (err, item) => {
      debug(`error ${item.path}`);

      reject(err);
    }).on('end', () => {
      resolve(Promise.all(promises));
    });
  });
});
