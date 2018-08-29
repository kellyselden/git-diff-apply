'use strict';

const commit = require('./commit');
const run = require('./run');

module.exports = function commitAndTag(tag, options) {
  commit(options);
  run(`git tag ${tag}`, options);
};
