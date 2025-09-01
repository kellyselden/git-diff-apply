#!/usr/bin/env node
'use strict';

const gitDiffApply = require('../src');

const { argv } = require('yargs')
  .options({
    'remote-url': {
      type: 'string',
    },
    'start-tag': {
      type: 'string',
    },
    'end-tag': {
      type: 'string',
    },
    'ignored-files': {
      type: 'array',
    },
    'reset': {
      type: 'boolean',
    },
    'init': {
      type: 'boolean',
    },
    'create-custom-diff': {
      type: 'boolean',
    },
    'start-command': {
      type: 'string',
    },
    'end-command': {
      type: 'string',
    },
  });

(async() => {
  try {
    await gitDiffApply(argv);
  } catch (err) {
    console.log(err);
    return;
  }
})();
