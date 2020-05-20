'use strict';

const { runWithSpawn } = require('./run');

async function gitInit(options) {
  await runWithSpawn('git', ['init'], options);
  await gitConfigInit(options);
}

async function gitConfigInit(options) {
  await runWithSpawn('git', ['config', 'user.email', 'you@example.com'], options);
  await runWithSpawn('git', ['config', 'user.name', 'Your Name'], options);

  // ignore any global .gitignore that will mess with us
  await runWithSpawn('git', ['config', 'core.excludesfile', 'false'], options);

  // this global setting messes with diffs
  // https://github.com/ember-cli/ember-cli-update/issues/995
  await runWithSpawn('git', ['config', 'diff.noprefix', 'false'], options);
}

module.exports = gitInit;
module.exports.gitConfigInit = gitConfigInit;
