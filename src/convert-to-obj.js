'use strict';

const fixturify = require('fixturify');

module.exports = function convertToObj(dir, globs) {
  let obj = fixturify.readSync(dir, {
    globs
  });
  delete obj['.git'];
  return obj;
};
