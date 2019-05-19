'use strict';

const run = require('./run');
const { isGitClean } = require('./git-status');

module.exports = async function commit(options) {
  await run('git add -A', options);

  // it's possible for there to be no changes between tags
  if (!await isGitClean(options)) {
    // run with --no-verify to skip pre-commit application level hooks
    await run('git commit -m "message" --no-verify', options);
  }
};
