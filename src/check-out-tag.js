'use strict';

const run = require('./run');

module.exports = async function checkOutTag(tag, options) {
  let sha = await run(`git rev-parse ${tag}`, options);
  await run(`git checkout ${sha.trim()}`, options);
};
