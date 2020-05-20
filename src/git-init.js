'use strict';

const { execaCommand } = require('./run');

async function gitInit(options) {
  await execaCommand('git init', options);
  await gitConfigInit(options);
}

async function gitConfigInit(options) {
  await execaCommand('git config user.email "you@example.com"', options);
  await execaCommand('git config user.name "Your Name"', options);

  // ignore any global .gitignore that will mess with us
  await execaCommand('git config core.excludesfile false', options);

  // this global setting messes with diffs
  // https://github.com/ember-cli/ember-cli-update/issues/995
  await execaCommand('git config diff.noprefix false', options);
}

module.exports = gitInit;
module.exports.gitConfigInit = gitConfigInit;
