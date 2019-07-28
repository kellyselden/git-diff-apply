'use strict';

const path = require('path');
const run = require('./run');

module.exports = async function checkOutTag(repoDir, tag) {
  let gitDir = path.join(repoDir, '.git');

  let sha = await run(`git --git-dir="${gitDir}" rev-parse ${tag}`);
  await run(`git --git-dir="${gitDir}" --work-tree="${repoDir}" checkout ${sha.trim()}`);
};
