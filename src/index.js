'use strict';

const cp = require('child_process');
const path = require('path');
const tmp = require('tmp');
const uuidv1 = require('uuid/v1');
const fixturify = require('fixturify');
const utils = require('./utils');
const copyRegex = require('./copy-regex');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const isGitClean = require('./is-git-clean');
const debug = require('debug')('git-diff-apply');

const tempBranchName = uuidv1();

function checkOutTag(tmpDir, tmpGitDir, tag) {
  let commit = utils.run(`git --git-dir="${tmpGitDir}" rev-parse ${tag}`);
  utils.run(`git --git-dir="${tmpGitDir}" --work-tree="${tmpDir}" checkout ${commit.trim()}`);
}

function convertToObj(dir, include) {
  let obj = fixturify.readSync(dir, {
    include
  });
  delete obj['.git'];
  return obj;
}

module.exports = function gitDiffApply(options) {
  let remoteUrl = options.remoteUrl;
  let startTag = options.startTag;
  let endTag = options.endTag;
  let ignoreConflicts = options.ignoreConflicts;
  let ignoredFiles = options.ignoredFiles || [];

  let tmpDir;
  let tmpGitDir;
  let oldBranchName;
  let from;
  let commit;
  let hasConflicts;

  let isTempBranchCheckedOut;
  let isTempBranchUntracked;
  let isTempBranchModified;
  let isTempBranchCommitted;

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

    checkOutTag(tmpDir, tmpGitDir, startTag);

    oldBranchName = getCheckedOutBranchName();
    utils.run(`git checkout --orphan ${tempBranchName}`);
    isTempBranchCheckedOut = true;

    utils.run('git reset --hard');

    if (debug.enabled) {
      debug(require('fs').readdirSync(tmpDir));
    }

    isTempBranchUntracked = true;
    debug(`copy ${tmpDir} ${process.cwd()}`);
    return utils.copy(tmpDir, '.', {
      filter: copyRegex
    });
  }).then(() => {
    utils.run('git add -A');
    utils.run('git commit -m "startTag"');
    isTempBranchUntracked = false;
    isTempBranchCommitted = true;

    from = convertToObj('.', ignoredFiles);

    isTempBranchUntracked = true;
    isTempBranchModified = true;
    utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} | git apply`);

    for (let ignoredFile of ignoredFiles) {
      utils.run(`git checkout -- ${ignoredFile}`);
    }

    let wereThereAnyChanged = !isGitClean();

    if (wereThereAnyChanged) {
      utils.run('git add -A');
      utils.run('git commit -m "diff"');
    }
    isTempBranchUntracked = false;
    isTempBranchModified = false;

    if (wereThereAnyChanged) {
      commit = utils.run('git rev-parse HEAD');
    }

    utils.run(`git checkout ${oldBranchName}`);
    isTempBranchCheckedOut = false;

    if (wereThereAnyChanged) {
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
      debug('git mergetool');
      cp.spawnSync('git', ['mergetool'], {
        stdio: 'inherit'
      });
    }

    checkOutTag(tmpDir, tmpGitDir, endTag);

    let to = convertToObj(tmpDir, ignoredFiles);

    return {
      from,
      to
    };
  });
};

module.exports.isGitClean = isGitClean;
