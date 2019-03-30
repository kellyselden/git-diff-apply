'use strict';

const fs = require('fs-extra');
const path = require('path');
const co = require('co');
const run = require('./run');

module.exports = co.wrap(function* gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // run('git rm -rf .', options);

  let files = run('git ls-files', options).trim().split(/\r?\n/g);

  for (let file of files) {
    // this removes folders that become empty,
    // which we are trying to avoid
    // run(`git rm -f "${file}"`, options);

    yield fs.remove(path.join(options.cwd, file));

    run(`git add "${file}"`, options);
  }
});
