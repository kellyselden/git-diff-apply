'use strict';

const { spawn } = require('child_process');
const debug = require('debug')('git-diff-apply');

module.exports = function resolveConflicts(options) {
  debug('git mergetool');

  // pipe for those using as a library can interact
  return spawn('git', ['mergetool'], options);
};
