'use strict';

const run = require('./run');

async function doesBranchExist(branchName, options) {
  try {
    // https://stackoverflow.com/questions/5167957
    await run(`git show-ref --verify --quiet refs/heads/${branchName}`, options);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = doesBranchExist;
