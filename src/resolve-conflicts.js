'use strict';

const cp = require('child_process');
const debug = require('debug')('git-diff-apply');

module.exports = function resolveConflicts() {
  debug('git mergetool');
  cp.spawnSync('git', ['mergetool'], {
    stdio: 'inherit'
  });
};
