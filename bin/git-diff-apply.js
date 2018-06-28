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
    }
  });

const remoteUrl = argv['remote-url'];
const startTag = argv['start-tag'];
const endTag = argv['end-tag'];
const resolveConflicts = argv['resolve-conflicts'];
const ignoredFiles = argv['ignored-files'];
const reset = argv['reset'];

gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  resolveConflicts,
  ignoredFiles,
  reset
}).catch(console.error);
