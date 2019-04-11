'use strict';

const co = require('co');
const path = require('path');
const fs = require('fs-extra');
const klaw = require('klaw');
const copyRegex = require('./copy-regex');
const debug = require('debug')('git-diff-apply');

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
        // `fs.rename` can throw EXDEV if across partitions
        promise = fs.move(fromFile, toFile).catch(co.wrap(function*(err) {
          // `fs.move` doesn't handle broken symlinks
          // https://github.com/jprichardson/node-fs-extra/issues/638
          if (!err.message.startsWith('ENOENT: no such file or directory, stat')) {
            throw err;
          }
          // reimplement `fs.rename`...
          let brokenSymlink = yield fs.readlink(fromFile);
          let absolute = path.resolve(path.dirname(fromFile), brokenSymlink);
          yield fs.ensureFile(absolute);
          yield fs.move(fromFile, toFile);
          yield fs.unlink(absolute);
        }));
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
