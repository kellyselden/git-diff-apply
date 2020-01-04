#!/usr/bin/env node
'use strict';

const gitDiffApply = require('../src');

const { argv } = require('yargs')
  .options({
    'remote-url': {
      type: 'string'
    },
    'start-tag': {
      type: 'string'
    },
    'end-tag': {
      type: 'string'
    },
    'resolve-conflicts': {
      type: 'boolean'
    },
    'ignored-files': {
      type: 'array'
    },
    'reset': {
      type: 'boolean'
    },
    'init': {
      type: 'boolean'
    },
    'create-custom-diff': {
      type: 'boolean'
    },
    'start-command': {
      type: 'string'
    },
    'end-command': {
      type: 'string'
    }
  });

(async() => {
  let returnObject;
  try {
    returnObject = await gitDiffApply(argv);
  } catch (err) {
    console.log(err);
    return;
  }

  let ps = returnObject.resolveConflictsProcess;
  if (ps) {
    process.stdin.pipe(ps.stdin);
    ps.stdout.pipe(process.stdout);
    ps.stderr.pipe(process.stderr);

    // since we are piping, not inheriting, the child process
    // doesn't have the power to close its parent
    ps.on('exit', process.exit);
  }
})();
