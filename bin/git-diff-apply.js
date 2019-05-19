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

argv.wasRunAsExecutable = true;

(async() => {
  try {
    await gitDiffApply(argv);
  } catch (err) {
    console.log(err);
  }
})();
