'use strict';

const path = require('path');
const tmp = require('tmp');
const uuidv1 = require('uuid/v1');
const utils = require('./utils');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const isGitClean = require('./is-git-clean');
const checkOutTag = require('./check-out-tag');
const convertToObj = require('./convert-to-obj');
const resolveConflicts = require('./resolve-conflicts');

const tempBranchName = uuidv1();

module.exports = function gitDiffApply(options) {
  let remoteUrl = options.remoteUrl;
  let startTag = options.startTag;
  let endTag = options.endTag;
  let ignoreConflicts = options.ignoreConflicts;
  let ignoredFiles = options.ignoredFiles || [];

  let tmpDir;
  let tmpGitDir;
  let oldBranchName;
  let commit;
  let hasConflicts;
  let returnObject;

  let isTempBranchCheckedOut;
  let isTempBranchUntracked;
  let isTempBranchModified;
  let isTempBranchCommitted;

  function buildReturnObject() {
    checkOutTag(tmpDir, startTag);

    let from = convertToObj(tmpDir, ignoredFiles);

    checkOutTag(tmpDir, endTag);

    let to = convertToObj(tmpDir, ignoredFiles);

    return {
      from,
      to
    };
  }

  return Promise.resolve().then(() => {
    if (startTag === endTag) {
      throw 'Tags match, nothing to apply';
    }

    if (!isGitClean()) {
      throw 'You must start with a clean working directory';
    }

    tmpDir = tmp.dirSync().name;
    tmpGitDir = path.join(tmpDir, '.git');

    utils.run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);

    returnObject = buildReturnObject();

    checkOutTag(tmpDir, startTag);

    oldBranchName = getCheckedOutBranchName();
    utils.run(`git checkout --orphan ${tempBranchName}`);
    isTempBranchCheckedOut = true;

    utils.run('git reset --hard');

    isTempBranchUntracked = true;
    return utils.copy(tmpDir, process.cwd());
  }).then(() => {
    utils.run('git add -A');
    utils.run('git commit -m "startTag"');
    isTempBranchUntracked = false;
    isTempBranchCommitted = true;

    isTempBranchUntracked = true;
    isTempBranchModified = true;
    utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} | git apply`);

    for (let ignoredFile of ignoredFiles) {
      utils.run(`git checkout -- ${ignoredFile}`);
    }

    let wereAnyChanged = !isGitClean();

    if (wereAnyChanged) {
      utils.run('git add -A');
      utils.run('git commit -m "diff"');
    }
    isTempBranchUntracked = false;
    isTempBranchModified = false;

    if (wereAnyChanged) {
      commit = utils.run('git rev-parse HEAD');
    }

    utils.run(`git checkout ${oldBranchName}`);
    isTempBranchCheckedOut = false;

    if (wereAnyChanged) {
      try {
        utils.run(`git cherry-pick --no-commit ${commit.trim()}`);
      } catch (err) {
        hasConflicts = true;
      }
    }
  }).catch(err => {
    if (isTempBranchUntracked) {
      utils.run('git clean -f');
    }
    if (isTempBranchModified) {
      utils.run('git reset --hard');
    }

    if (isTempBranchCheckedOut) {
      utils.run(`git checkout ${oldBranchName}`);
    }

    return err;
  }).then(err => {
    if (isTempBranchCommitted) {
      utils.run(`git branch -D ${tempBranchName}`);
    }

    if (err) {
      throw err;
    }

    if (hasConflicts && !ignoreConflicts) {
      resolveConflicts();
    }

    return returnObject;
  });
};

module.exports.isGitClean = isGitClean;
