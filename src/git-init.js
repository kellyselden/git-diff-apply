'use strict';

const run = require('./run');

async function gitInit(options) {
  await run('git init', options);
  await gitConfigInit(options);
}

async function gitConfigInit(options) {
  await run('git config user.email "you@example.com"', options);
  await run('git config user.name "Your Name"', options);

  // ignore any global .gitignore that will mess with us
  await run('git config core.excludesfile false', options);

  // this global setting messes with diffs
  // https://github.com/ember-cli/ember-cli-update/issues/995
  await run('git config diff.noprefix false', options);
}

module.exports = gitInit;
module.exports.gitConfigInit = gitConfigInit;
