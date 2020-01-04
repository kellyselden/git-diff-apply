'use strict';

const path = require('path');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);
const fs = require('fs-extra');
const uuidv1 = require('uuid/v1');
const debug = require('debug')('git-diff-apply');
const utils = require('./utils');
const getRootDir = require('./get-root-dir');
const getSubDir = require('./get-sub-dir');
const gitInit = require('./git-init');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const gitStatus = require('./git-status');
const commit = require('./commit');
const checkOutTag = require('./check-out-tag');
const convertToObj = require('./convert-to-obj');
const resolveConflicts = require('./resolve-conflicts');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const createCustomRemote = require('./create-custom-remote');
const mergeDir = require('./merge-dir');
const doesBranchExist = require('./does-branch-exist');

const { isGitClean } = gitStatus;

const tempBranchName = uuidv1();

async function ensureDir(dir) {
  debug('ensureDir', dir);
  await fs.ensureDir(dir);
}

module.exports = async function gitDiffApply({
  cwd,
  remoteUrl,
  startTag,
  endTag,
  resolveConflicts: _resolveConflicts,
  ignoredFiles = [],
  reset,
  init,
  createCustomDiff,
  startCommand,
  endCommand
}) {
  let _tmpDir;
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
  let gitIgnoredFiles;

  let err;

  async function buildReturnObject() {
    let from;

    if (reset || init) {
      from = {};
    } else {
      await checkOutTag(startTag, { cwd: _tmpDir });

      from = convertToObj(_tmpDir, ignoredFiles);
    }

    await checkOutTag(endTag, { cwd: _tmpDir });

    let to = convertToObj(_tmpDir, ignoredFiles);

    return {
      from,
      to
    };
  }

  async function namespaceRepoWithSubDir(subDir) {
    let newTmpDir = await tmpDir();

    await gitInit({ cwd: newTmpDir });

    let newTmpSubDir = path.join(newTmpDir, subDir);

    async function copyToSubDir(tag) {
      await ensureDir(newTmpSubDir);

      await checkOutTag(tag, { cwd: _tmpDir });

      await utils.copy(_tmpDir, newTmpSubDir);

      await commitAndTag(tag, { cwd: newTmpDir });
    }

    if (!(reset || init)) {
      await copyToSubDir(startTag);

      await gitRemoveAll({ cwd: newTmpDir });
    }

    await copyToSubDir(endTag);

    _tmpDir = newTmpDir;
    tmpWorkingDir = newTmpSubDir;
  }

  async function copy() {
    await utils.copy(tmpWorkingDir, cwd);
  }

  async function resetIgnoredFiles() {
    for (let ignoredFile of ignoredFiles) {
      // An exist check is not good enough.
      // `git checkout` will fail unless it is also tracked.
      let isTracked = await utils.run(`git ls-files ${ignoredFile}`, { cwd });
      if (isTracked) {
        await utils.run(`git checkout -- ${ignoredFile}`, { cwd });
      } else {
        await fs.remove(path.join(cwd, ignoredFile));
      }
    }
  }

  async function createPatchFile() {
    let patchFile = path.join(await tmpDir(), 'file.patch');
    await utils.run(`git diff ${startTag} ${endTag} --binary > ${patchFile}`, { cwd: _tmpDir });
    if (await fs.readFile(patchFile, 'utf8') !== '') {
      return patchFile;
    }
  }

  async function applyPatch(patchFile) {
    // --whitespace=fix seems to prevent any unnecessary conflicts with line endings
    // https://stackoverflow.com/questions/6308625/how-to-avoid-git-apply-changing-line-endings#comment54419617_11189296
    await utils.run(`git apply --whitespace=fix ${patchFile}`, { cwd });
  }

  async function go() {
    if (reset || init) {
      await checkOutTag(endTag, { cwd: _tmpDir });

      isCodeUntracked = true;
      isCodeModified = true;
      if (reset) {
        await utils.gitRemoveAll({ cwd: root });
      }

      await copy();

      await utils.run('git reset', { cwd });

      await resetIgnoredFiles();

      return;
    }

    await checkOutTag(startTag, { cwd: _tmpDir });

    oldBranchName = await getCheckedOutBranchName({ cwd });
    await utils.run(`git checkout --orphan ${tempBranchName}`, { cwd });
    isTempBranchCheckedOut = true;

    await utils.gitRemoveAll({ cwd: root });

    gitIgnoredFiles = await tmpDir();
    await mergeDir(cwd, gitIgnoredFiles);
    shouldReturnGitIgnoredFiles = true;

    isCodeUntracked = true;
    await copy();

    isTempBranchCommitted = true;
    await commit({ cwd });
    isCodeUntracked = false;

    let patchFile = await createPatchFile();
    if (!patchFile) {
      return;
    }

    isCodeUntracked = true;
    isCodeModified = true;
    await applyPatch(patchFile);

    await resetIgnoredFiles();

    let wereAnyChanged = !await isGitClean({ cwd });

    if (wereAnyChanged) {
      await commit({ cwd });
    }
    isCodeUntracked = false;
    isCodeModified = false;

    let sha;
    if (wereAnyChanged) {
      sha = await utils.run('git rev-parse HEAD', { cwd });
    }

    await utils.run(`git checkout ${oldBranchName}`, { cwd });
    isTempBranchCheckedOut = false;

    if (wereAnyChanged) {
      try {
        await utils.run(`git cherry-pick --no-commit ${sha.trim()}`, { cwd });
      } catch (err) {
        hasConflicts = true;
      }
    }
  }

  try {
    if (startTag === endTag && !(reset || init)) {
      throw 'Tags match, nothing to apply';
    }

    let isClean;

    try {
      isClean = await isGitClean({ cwd });
    } catch (err) {
      throw 'Not a git repository';
    }

    if (!isClean) {
      throw 'You must start with a clean working directory';
    }

    if (createCustomDiff) {
      let tmpPath = await createCustomRemote({
        startCommand,
        endCommand,
        startTag,
        endTag,
        reset,
        init
      });

      remoteUrl = tmpPath;
    }

    _tmpDir = await tmpDir();
    tmpWorkingDir = _tmpDir;

    await utils.run(`git clone ${remoteUrl} ${_tmpDir}`);

    returnObject = await buildReturnObject();

    root = await getRootDir({ cwd });
    let subDir = await getSubDir({ cwd });
    if (subDir) {
      debug('subDir', subDir);

      await namespaceRepoWithSubDir(subDir);
    }

    await go();

    debug('success');
  } catch (_err) {
    err = _err;

    try {
      if (isCodeUntracked) {
        await utils.run('git clean -f', { cwd });
      }
      if (isCodeModified) {
        await utils.run('git reset --hard', { cwd });
      }
    } catch (err2) {
      throw {
        err,
        err2
      };
    }
  }

  try {
    if (isTempBranchCheckedOut) {
      await utils.run(`git checkout ${oldBranchName}`, { cwd });
    }

    if (isTempBranchCommitted && await doesBranchExist(tempBranchName, { cwd })) {
      await utils.run(`git branch -D ${tempBranchName}`, { cwd });
    }

    if (shouldReturnGitIgnoredFiles) {
      await mergeDir(gitIgnoredFiles, cwd);
    }
  } catch (err2) {
    err = {
      err,
      err2
    };
  }

  if (err) {
    debug('failure');

    throw err;
  }

  if (hasConflicts && _resolveConflicts) {
    returnObject.resolveConflictsProcess = resolveConflicts({ cwd });
  }

  return returnObject;
};

module.exports.run = utils.run;
module.exports.gitInit = gitInit;
module.exports.gitStatus = gitStatus;
module.exports.isGitClean = isGitClean;
module.exports.gitRemoveAll = gitRemoveAll;
