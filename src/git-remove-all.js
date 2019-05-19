'use strict';

const fs = require('fs-extra');
const path = require('path');
const run = require('./run');

module.exports = async function gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // run('git rm -rf .', options);

  let files = run('git ls-files', options).trim().split(/\r?\n/g);

  for (let file of files) {
    // this removes folders that become empty,
    // which we are trying to avoid
    // run(`git rm -f "${file}"`, options);

    await fs.remove(path.join(options.cwd, file));

    run(`git add "${file}"`, options);
  }
};
