'use strict';

const cp = require('child_process');
const path = require('path');
const tmp = require('tmp');
const uuidv1 = require('uuid/v1');
const denodeify = require('denodeify');
const ncp = denodeify(require('ncp'));
const run = require('./run');
const debug = require('debug')('git-diff-apply');

const branchName = uuidv1();

module.exports = function gitDiffApply(options) {
  // let remoteName = options.remoteName;
  let remoteUrl = options.remoteUrl;
  let startTag = options.startTag;
  let endTag = options.endTag;

  let tmpDir = tmp.dirSync().name;
  let tmpGitDir = path.join(tmpDir, '.git');

  run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);
  run(`git checkout --orphan ${branchName}`);
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
    filter: /^(?:(?!\.git($|\/)).)+$/
  }).then(() => {
    run('git add -A');
    run(`git commit -m "${startTag}"`);

    run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} | git apply`);
    run('git add -A');
    run('git commit -m "diff"');
    commit = run('git rev-parse HEAD');
    run('git checkout master');

    let hasConflicts = false;

    try {
      run(`git cherry-pick --no-commit ${commit.trim()}`);
    } catch (err) {
      hasConflicts = true;
    }

    run(`git branch -D ${branchName}`);

    if (hasConflicts) {
      debug('git mergetool');

      // inherit has issues in node 4 windows
      // https://github.com/nodejs/node/issues/3596
      // cp.spawnSync('git', ['mergetool'], {
      //   stdio: 'inherit'
      // });

      return new Promise(resolve => {
        let ps = cp.spawn('git', ['mergetool']);
        process.stdin.pipe(ps.stdin);
        ps.stdout.pipe(process.stdout);
        ps.stderr.pipe(process.stderr);
        ps.on('exit', resolve);
      });
    }

    // run(`git commit -m "git-diff-apply: ${startTag} => ${endTag}"`);
  });
};
