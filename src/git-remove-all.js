'use strict';

const fs = require('fs-extra');
const path = require('path');
const run = require('./run');

async function lsFiles(options) {
  // attempt to fix https://github.com/ember-cli/ember-cli-update/issues/583
  options = { maxBuffer: 500 * 1024, ...options };

  let files = (await run('git ls-files', options)).trim().split(/\r?\n/g);

  return files;
}

module.exports = async function gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // await run('git rm -rf .', options);

  let files = await lsFiles(options);

  for (let file of files) {
    // this removes folders that become empty,
    // which we are trying to avoid
    // await run(`git rm -f "${file}"`, options);

    await fs.remove(path.join(options.cwd, file));

    await run(`git add "${file}"`, options);
  }
};
