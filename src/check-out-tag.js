'use strict';

const run = require('./run');

module.exports = async function checkOutTag(repoDir, tag) {
  let sha = await run(`git rev-parse ${tag}`, { cwd: repoDir });
  await run(`git checkout ${sha.trim()}`, { cwd: repoDir });
};
