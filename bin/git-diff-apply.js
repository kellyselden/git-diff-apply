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
  let options = {
    wasRunAsExecutable: true,
    ...argv
  };

  try {
    await gitDiffApply(options);
  } catch (err) {
    console.log(err);
  }
})();
