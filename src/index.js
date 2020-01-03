'use strict';

const path = require('path');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);
const fs = require('fs-extra');
const debug = require('debug')('git-diff-apply');
const utils = require('./utils');
const getRootDir = require('./get-root-dir');
const getSubDir = require('./get-sub-dir');
const gitInit = require('./git-init');
const gitStatus = require('./git-status');
const checkOutTag = require('./check-out-tag');
const convertToObj = require('./convert-to-obj');
const resolveConflicts = require('./resolve-conflicts');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const createCustomRemote = require('./create-custom-remote');

const { isGitClean } = gitStatus;

async function ensureDir(dir) {
  debug('ensureDir', dir);
  await fs.ensureDir(dir);
}

module.exports = async function gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  resolveConflicts: _resolveConflicts,
  ignoredFiles = [],
  reset,
  init,
  createCustomDiff,
  startCommand,
  endCommand,
  wasRunAsExecutable
}) {
  let _tmpDir;
  let tmpGitDir;
  let tmpWorkingDir;

  let hasConflicts;
  let returnObject;

  let isCodeUntracked;
  let isCodeModified;

  let root;
  let cwd;

  let err;

  async function buildReturnObject() {
    let from;

    if (reset || init) {
      from = {};
    } else {
      await checkOutTag(_tmpDir, startTag);

      from = convertToObj(_tmpDir, ignoredFiles);
    }

    await checkOutTag(_tmpDir, endTag);

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

      await checkOutTag(_tmpDir, tag);

      await utils.copy(_tmpDir, newTmpSubDir);

      await commitAndTag(tag, { cwd: newTmpDir });
    }

    if (!(reset || init)) {
      await copyToSubDir(startTag);

      await gitRemoveAll({ cwd: newTmpDir });
    }

    await copyToSubDir(endTag);

    _tmpDir = newTmpDir;
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = newTmpSubDir;
  }

  async function copy() {
    await utils.copy(tmpWorkingDir, cwd);
  }

  async function resetIgnoredFiles() {
    for (let ignoredFile of ignoredFiles) {
      // An exist check is not good enough.
      // `git checkout` will fail unless it is also tracked.
      let isTracked = await utils.run(`git ls-files ${ignoredFile}`);
      if (isTracked) {
        await utils.run(`git checkout -- ${ignoredFile}`);
      } else {
        await fs.remove(ignoredFile);
      }
    }
  }

  async function createPatchFile() {
    let patchFile = path.join(await tmpDir(), 'file.patch');
    await utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} --binary > ${patchFile}`);
    if (await fs.readFile(patchFile, 'utf8') !== '') {
      return patchFile;
    }
  }

  async function applyDiff(patchFile) {
    // --whitespace=fix seems to prevent any unnecessary conflicts with line endings
    // https://stackoverflow.com/questions/6308625/how-to-avoid-git-apply-changing-line-endings#comment54419617_11189296
    // -3 gives you conflict markers
    // https://stackoverflow.com/questions/16190387/when-applying-a-patch-is-there-any-way-to-resolve-conflicts#comment54083817_16968982
    await utils.run(`git apply --whitespace=fix -3 ${patchFile}`);
  }

  async function go() {
    if (reset || init) {
      await checkOutTag(_tmpDir, endTag);

      isCodeUntracked = true;
      isCodeModified = true;
      if (reset) {
        await utils.gitRemoveAll({ cwd: root });
      }

      await copy();

      await utils.run('git reset');

      await resetIgnoredFiles();

      return;
    }

    let patchFile = await createPatchFile();

    if (patchFile) {
      try {
        await applyDiff(patchFile);
      } catch (err) {
        hasConflicts = true;
      }

      await resetIgnoredFiles();
    }
  }

  try {
    if (startTag === endTag && !(reset || init)) {
      throw 'Tags match, nothing to apply';
    }

    let isClean;

    try {
      isClean = await isGitClean();
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
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = _tmpDir;

    await utils.run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);

    returnObject = await buildReturnObject();

    root = await getRootDir();
    let subDir = await getSubDir(root);
    if (subDir) {
      debug('subDir', subDir);

      await namespaceRepoWithSubDir(subDir);
    }

    cwd = process.cwd();

    await go();

    debug('success');
  } catch (_err) {
    err = _err;

    try {
      if (isCodeUntracked) {
        await utils.run('git clean -f');
      }
      if (isCodeModified) {
        await utils.run('git reset --hard');
      }
    } catch (err2) {
      throw {
        err,
        err2
      };
    }
  }

  if (err) {
    debug('failure');

    throw err;
  }

  if (hasConflicts && _resolveConflicts) {
    returnObject.resolveConflictsProcess = resolveConflicts({
      shouldPipe: !wasRunAsExecutable
    });
  }

  return returnObject;
};

module.exports.run = utils.run;
module.exports.gitInit = gitInit;
module.exports.gitStatus = gitStatus;
module.exports.isGitClean = isGitClean;
module.exports.gitRemoveAll = gitRemoveAll;
