'use strict';

const commit = require('./commit');
const { runWithSpawn } = require('./run');

module.exports = async function commitAndTag(tag, options) {
  await commit(tag, options);
  await runWithSpawn('git', ['tag', tag], options);
};
