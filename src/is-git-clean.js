'use strict';

const run = require('./run');

module.exports = function() {
  return !run('git status --porcelain');
};
