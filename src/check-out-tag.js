'use strict';

const { runWithSpawn } = require('./run');

module.exports = async function checkOutTag(tag, options) {
  let sha = await runWithSpawn('git', ['rev-parse', tag], options);
  await runWithSpawn('git', ['checkout', sha.trim()], options);
};
