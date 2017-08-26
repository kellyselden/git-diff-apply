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
    },
    'ignored-files': {
      type: 'array'
    }
  })
  .version()
  .help()
  .argv;

const remoteUrl = argv['remote-url'];
const startTag = argv['start-tag'];
const endTag = argv['end-tag'];
const ignoreConflicts = argv['ignore-conflicts'];
const ignoredFiles = argv['ignored-files'];

gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  ignoreConflicts,
  ignoredFiles
}).catch(console.error);
