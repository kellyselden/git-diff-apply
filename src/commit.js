'use strict';

const run = require('./run');
const isGitClean = require('./is-git-clean');

module.exports = function commit(options) {
  run('git add -A', options);

  // it's possible for there to be no changes between tags
  if (!isGitClean(options)) {
    // run with --no-verify to skip pre-commit application level hooks
    run('git commit -m "message" --no-verify', options);
  }
};
