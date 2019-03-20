'use strict';

const run = require('./run');

module.exports = function gitRemoveAll(options) {
  run('git rm -r . -f', options);
};
