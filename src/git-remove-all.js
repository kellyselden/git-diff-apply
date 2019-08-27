'use strict';

const fs = require('fs-extra');
const path = require('path');
const run = require('./run');
const { runWithSpawn } = require('./run');

module.exports = async function gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // await run('git rm -rf .', options);

  // Using spawn rather than run here because ls-files produces a lot
  // of output if it gets run in a large repo
  let files = (await runWithSpawn('git', ['ls-files'], options))
    .split(/\r?\n/g)
    .filter(Boolean);

  for (let file of files) {
    // this removes folders that become empty,
    // which we are trying to avoid
    // await run(`git rm -f "${file}"`, options);

    await fs.remove(path.join(options.cwd, file));

    await run(`git add "${file}"`, options);
  }
};
