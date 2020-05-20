'use strict';

const commit = require('./commit');
const { spawn } = require('./run');

module.exports = async function commitAndTag(tag, options) {
  await commit(tag, options);
  await spawn('git', ['tag', tag], options);
};
