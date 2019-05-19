'use strict';

const run = require('./run');

module.exports = async function getCheckedOutBranchName(options) {
  // "git branch" doesn't show orphaned branches
  let str = await run('git symbolic-ref --short HEAD', options);

  return str.replace(/\r?\n/g, '');
};
