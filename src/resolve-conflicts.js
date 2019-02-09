'use strict';

const { spawn } = require('child_process');
const debug = require('debug')('git-diff-apply');

module.exports = function resolveConflicts({
  shouldPipe
}) {
  debug('git mergetool');
  // we need to print it to the host's console
  // or make it available for piping
  return spawn('git', ['mergetool'], {
    stdio: shouldPipe ? 'pipe' : 'inherit'
  });
};
