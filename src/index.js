'use strict';

const cp = require('child_process');
const run = require('./run');

module.exports = function gitDiffApply(options) {
  let remoteName = options.remoteName;
  let remoteUrl = options.remoteUrl;
  let startTag = options.startTag;
  let endTag = options.endTag;

  run(`git remote add ${remoteName} ${remoteUrl}`);
  run(`git fetch ${remoteName}`);
  run(`git checkout ${startTag}`);
  run(`git diff ${startTag} ${endTag} | git apply`);
  run('git add -A');
  run('git commit -m "diff"');
  run(`git tag ${startTag}-${endTag}`);
  run('git checkout master');

  let hasConflicts = false;

  try {
    run(`git cherry-pick --no-commit ${startTag}-${endTag}`);
  } catch (err) {
    hasConflicts = true;
  }

  if (hasConflicts) {
    let response = cp.spawnSync('git', ['mergetool'], {
      stdio: 'inherit'
    });
    if (response.status > 0) {
      process.exit();
    }
  }

  run(`git commit -m "${startTag}-${endTag}"`);
};
