'use strict';

const run = require('./run');
const utils = require('./utils');

module.exports = async function commit(message, options) {
  await run('git add -A', options);

  // run with --no-verify to skip pre-commit application level hooks
  // --allow-empty because either their is no files for the first commit,
  // or the second commit has no changes
  await utils.run(`git commit --allow-empty -m "${message}" --no-verify`, options);
};
