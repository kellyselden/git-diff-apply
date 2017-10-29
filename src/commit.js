'use strict';

const run = require('./run');

module.exports = function commit() {
  run('git add -A');
  run('git commit -m "message"');
};
