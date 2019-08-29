'use strict';

const fs = require('fs-extra');
const path = require('path');
const run = require('./run');
const { runWithSpawn } = require('./run');

async function lsFiles(options) {
  // Using spawn rather than run here because ls-files produces a lot
  // of output if it gets run in a large repo.
  // See https://github.com/kellyselden/git-diff-apply/pull/277
  let files = (await runWithSpawn('git', ['ls-files'], options))
    .split(/\r?\n/g)
    .filter(Boolean);

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
