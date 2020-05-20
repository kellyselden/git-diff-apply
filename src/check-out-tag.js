'use strict';

const { spawn } = require('./run');

module.exports = async function checkOutTag(tag, options) {
  let sha = await spawn('git', ['rev-parse', tag], options);
  await spawn('git', ['checkout', sha.trim()], options);
};
