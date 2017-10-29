'use strict';

const run = require('./run');

module.exports = function commit(options) {
  run('git add -A', options);
  run('git commit -m "message"', options);
};
