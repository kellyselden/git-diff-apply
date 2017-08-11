#!/usr/bin/env node
'use strict';

const gitDiffApply = require('../src');

const argv = require('yargs')
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
    'ignore-conflicts': {
      type: 'boolean'
    }
  })
  .version()
  .help()
  .argv;

const remoteUrl = argv['remote-url'];
const startTag = argv['start-tag'];
const endTag = argv['end-tag'];
const ignoreConflicts = argv['ignore-conflicts'];

gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  ignoreConflicts
}).catch(console.error);
