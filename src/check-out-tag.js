'use strict';

const path = require('path');
const utils = require('./utils');

module.exports = function checkOutTag(repoDir, tag) {
  let gitDir = path.join(repoDir, '.git');

  let commit = utils.run(`git --git-dir="${gitDir}" rev-parse ${tag}`);
  utils.run(`git --git-dir="${gitDir}" --work-tree="${repoDir}" checkout ${commit.trim()}`);
};
