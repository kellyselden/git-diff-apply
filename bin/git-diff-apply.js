#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const run = require('../src/run');

const argv = require('yargs')
  .options({
    'remote-name': {
      type: 'string'
    },
    'remote-url': {
      type: 'string'
    },
    'start-tag': {
      type: 'string'
    },
    'end-tag': {
      type: 'string'
    }
  })
  .argv;

const remoteName = argv['remote-name'];
const remoteUrl = argv['remote-url'];
const startTag = argv['start-tag'];
const endTag = argv['end-tag'];

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
