'use strict';

const cp = require('child_process');
const path = require('path');
const tmp = require('tmp');
const uuidv1 = require('uuid/v1');
const denodeify = require('denodeify');
const ncp = denodeify(require('ncp'));
const copyRegex = require('./copy-regex');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const isGitClean = require('./is-git-clean');
const run = require('./run');
const debug = require('debug')('git-diff-apply');

const tempBranchName = uuidv1();

module.exports = function gitDiffApply(options) {
  // let remoteName = options.remoteName;
  let remoteUrl = options.remoteUrl;
  let startTag = options.startTag;
  let endTag = options.endTag;

  if (!isGitClean(run('git status'))) {
    return Promise.reject('You must start with a clean working directory');
  }

  let tmpDir = tmp.dirSync().name;
  let tmpGitDir = path.join(tmpDir, '.git');

  run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);
  let oldBranchName = getCheckedOutBranchName(
    run('git branch')
  );
  run(`git checkout --orphan ${tempBranchName}`);
  run('git reset --hard');
  let commit = run(`git --git-dir="${tmpGitDir}" rev-parse ${startTag}`);
  run(`git --git-dir="${tmpGitDir}" --work-tree="${tmpDir}" checkout ${commit.trim()}`);

  debug(`copy ${tmpDir} ${process.cwd()}`);
  if (debug.enabled) {
    debug(require('fs').readdirSync(tmpDir));
  }

  return ncp(tmpDir, '.', {
    // filter(filePath) {
    //   // ignore .git folder but include files like .gitignore
    //   return filePath !== tmpGitDir && !filePath.startsWith(`${tmpGitDir}${path.sep}`);
    // }
    filter: copyRegex
  }).then(() => {
    run('git add -A');
    run(`git commit -m "${startTag}"`);

    run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} | git apply`);
    run('git add -A');
    run('git commit -m "diff"');
    commit = run('git rev-parse HEAD');
    run(`git checkout ${oldBranchName}`);

    let hasConflicts = false;

    try {
      run(`git cherry-pick --no-commit ${commit.trim()}`);
    } catch (err) {
      hasConflicts = true;
    }

    run(`git branch -D ${tempBranchName}`);

    if (hasConflicts) {
      debug('git mergetool');
      cp.spawnSync('git', ['mergetool'], {
        stdio: 'inherit'
      });
    }

    // run(`git commit -m "git-diff-apply: ${startTag} => ${endTag}"`);
  });
};
