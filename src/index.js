'use strict';

const os = require('os');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs-extra');
const co = require('co');
const uuidv1 = require('uuid/v1');
const debug = require('debug')('git-diff-apply');
const utils = require('./utils');
const getRootDir = require('./get-root-dir');
const getSubDir = require('./get-sub-dir');
const gitInit = require('./git-init');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const isGitClean = require('./is-git-clean');
const commit = require('./commit');
const checkOutTag = require('./check-out-tag');
const convertToObj = require('./convert-to-obj');
const resolveConflicts = require('./resolve-conflicts');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const createCustomRemote = require('./create-custom-remote');
const moveAll = require('./move-all');

const tempBranchName = uuidv1();

const isUnix = os.platform() !== 'win32';

function ensureDir(dir) {
  debug('ensureDirSync', dir);
  fs.ensureDirSync(dir);
}

function chdir(dir) {
  debug('chdir', dir);
  process.chdir(dir);
}

module.exports = co.wrap(function* gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  resolveConflicts: _resolveConflicts,
  ignoredFiles = [],
  reset,
  createCustomDiff,
  startCommand,
  endCommand
}) {
  let tmpDir;
  let tmpGitDir;
  let tmpWorkingDir;

  let oldBranchName;
  let hasConflicts;
  let returnObject;

  let isTempBranchCheckedOut;
  let isCodeUntracked;
  let isCodeModified;
  let shouldReturnGitIgnoredFiles;
  let isTempBranchCommitted;

  let root;
  let cwd;
  let gitIgnoredFiles;
  let shouldResetCwd;

  let err;

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

  let namespaceRepoWithSubDir = co.wrap(function* namespaceRepoWithSubDir(subDir) {
    let newTmpDir = tmp.dirSync().name;

    gitInit({ cwd: newTmpDir });

    let newTmpSubDir = path.join(newTmpDir, subDir);

    let copyToSubDir = co.wrap(function* copyToSubDir(tag) {
      ensureDir(newTmpSubDir);

      checkOutTag(tmpDir, tag);

      yield utils.copy(tmpDir, newTmpSubDir);

      commitAndTag(tag, { cwd: newTmpDir });
    });

    yield copyToSubDir(startTag);

    gitRemoveAll({ cwd: newTmpDir });

    yield copyToSubDir(endTag);

    tmpDir = newTmpDir;
    tmpGitDir = path.join(tmpDir, '.git');
    tmpWorkingDir = newTmpSubDir;
  });

  function copy() {
    return utils.copy(tmpWorkingDir, cwd);
  }

  function resetIgnoredFiles() {
    for (let ignoredFile of ignoredFiles) {
      utils.run(`git checkout -- ${ignoredFile}`);
    }
  }

  function applyDiff() {
    let patchFile = path.join(tmp.dirSync().name, 'file.patch');
    utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} --binary > ${patchFile}`);
    if (fs.readFileSync(patchFile, 'utf8') !== '') {
      utils.run(`git apply ${patchFile}`);
    }
  }

  let go = co.wrap(function* go() {
    if (reset) {
      checkOutTag(tmpDir, endTag);

      isCodeUntracked = true;
      isCodeModified = true;
      if (isUnix) {
        shouldResetCwd = true;
      }
      utils.run(`git rm -r ${cwd}`);

      if (isUnix) {
        ensureDir(cwd);
        chdir(cwd);
      }

      yield copy();

      utils.run('git reset');

      resetIgnoredFiles();
      isCodeModified = true;
      isCodeUntracked = true;

      return;
    }

    checkOutTag(tmpDir, startTag);

    chdir(root);
    shouldResetCwd = true;

    oldBranchName = getCheckedOutBranchName();
    utils.run(`git checkout --orphan ${tempBranchName}`);
    isTempBranchCheckedOut = true;

    utils.run('git reset --hard');

    ensureDir(cwd);

    chdir(cwd);
    shouldResetCwd = false;

    gitIgnoredFiles = tmp.dirSync().name;
    yield moveAll(cwd, gitIgnoredFiles);

    shouldReturnGitIgnoredFiles = true;

    isCodeUntracked = true;
    yield copy();

    commit();
    isCodeUntracked = false;
    isTempBranchCommitted = true;

    isCodeUntracked = true;
    isCodeModified = true;
    applyDiff();

    resetIgnoredFiles();

    let wereAnyChanged = !isGitClean();

    if (wereAnyChanged) {
      commit();
    }
    isCodeUntracked = false;
    isCodeModified = false;

    let sha;
    if (wereAnyChanged) {
      sha = utils.run('git rev-parse HEAD');
    }

    utils.run(`git checkout ${oldBranchName}`);
    isTempBranchCheckedOut = false;

    if (wereAnyChanged) {
      try {
        utils.run(`git cherry-pick --no-commit ${sha.trim()}`);
      } catch (err) {
        hasConflicts = true;
      }
    }
  });

  try {
    if (startTag === endTag && !reset) {
      throw 'Tags match, nothing to apply';
    }

    let isClean;

    try {
      isClean = isGitClean();
    } catch (err) {
      throw 'Not a git repository';
    }

    if (!isClean) {
      throw 'You must start with a clean working directory';
    }

    if (createCustomDiff) {
      let tmpPath = yield createCustomRemote({
        startCommand,
        endCommand,
        startTag,
        endTag
      });

      remoteUrl = tmpPath;
    }

    tmpDir = tmp.dirSync().name;
    tmpGitDir = path.join(tmpDir, '.git');
    tmpWorkingDir = tmpDir;

    utils.run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);

    returnObject = buildReturnObject();

    root = getRootDir();
    let subDir = getSubDir(root);
    if (subDir) {
      yield namespaceRepoWithSubDir(subDir);
    }

    cwd = process.cwd();

    yield go();
  } catch (_err) {
    if (shouldResetCwd) {
      chdir(cwd);
    }

    if (isCodeUntracked) {
      utils.run('git clean -f');
    }
    if (isCodeModified) {
      utils.run('git reset --hard');
    }

    if (isTempBranchCheckedOut) {
      utils.run(`git checkout ${oldBranchName}`);
    }

    err = _err;
  }

  if (isTempBranchCommitted) {
    utils.run(`git branch -D ${tempBranchName}`);
  }

  if (shouldReturnGitIgnoredFiles) {
    yield moveAll(gitIgnoredFiles, cwd);
  }

  if (err) {
    throw err;
  }

  if (hasConflicts && _resolveConflicts) {
    resolveConflicts();
  }

  return returnObject;
});

module.exports.isGitClean = isGitClean;
