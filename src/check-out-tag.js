'use strict';

const path = require('path');
const run = require('./run');

module.exports = function checkOutTag(repoDir, tag) {
  let gitDir = path.join(repoDir, '.git');

  let sha = run(`git --git-dir="${gitDir}" rev-parse ${tag}`);
  run(`git --git-dir="${gitDir}" --work-tree="${repoDir}" checkout ${sha.trim()}`);
};
