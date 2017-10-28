'use strict';

const fixturify = require('fixturify');

module.exports = function convertToObj(dir, include) {
  let obj = fixturify.readSync(dir, {
    include
  });
  delete obj['.git'];
  return obj;
};
