'use strict';

const run = require('./run');

module.exports = function getCheckedOutBranchName() {
  // "git branch" doesn't show orphaned branches
  let str = run('git symbolic-ref --short HEAD');

  return str.replace(/\r?\n/g, '');
};
