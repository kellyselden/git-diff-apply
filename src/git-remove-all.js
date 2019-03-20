'use strict';

const run = require('./run');

module.exports = function gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // run('git rm -r . -f', options);

  let files = run('git ls-files', options).trim();
  for (let file of files.split(/\r?\n/g)) {
    run(`git rm -rf ${file}`, options);
  }
};
