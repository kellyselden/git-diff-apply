'use strict';

const utils = require('./utils');

module.exports = function checkOutTag(tmpDir, tmpGitDir, tag) {
  let commit = utils.run(`git --git-dir="${tmpGitDir}" rev-parse ${tag}`);
  utils.run(`git --git-dir="${tmpGitDir}" --work-tree="${tmpDir}" checkout ${commit.trim()}`);
};
