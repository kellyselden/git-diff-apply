#!/usr/bin/env node
'use strict';

const gitDiffApply = require('../src');

const argv = require('yargs')
  .options({
    // 'remote-name': {
    //   type: 'string'
    // },
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

// const remoteName = argv['remote-name'];
const remoteUrl = argv['remote-url'];
const startTag = argv['start-tag'];
const endTag = argv['end-tag'];
const ignoreConflicts = argv['ignore-conflicts'];

gitDiffApply({
  // remoteName,
  remoteUrl,
  startTag,
  endTag,
  ignoreConflicts
}).catch(console.error);
