'use strict';

const path = require('path');
const run = require('./run');

module.exports = async function getSubDir() {
  // `git rev-parse --show-toplevel` won't work to determine root.
  // On GitHub Actions, `process.cwd()` returns 8.3 filenames,
  // ex. C:\Users\RUNNER~1\AppData\Local\Temp\...
  // https://github.com/ember-cli/ember-cli-update/pull/841/checks?check_run_id=360968913#step:6:329
  // and git returns a normal path. This makes the `path.relative`
  // not bahave as expected.
  let relative = (await run('git rev-parse --show-cdup')).trim();
  let subDir = path.relative(relative, process.cwd());
  return subDir;
};
