'use strict';

const { spawn } = require('./run');

async function gitInit(options) {
  await spawn('git', ['init'], options);
  await gitConfigInit(options);
}

async function gitConfigInit(options) {
  await spawn('git', ['config', 'user.email', 'you@example.com'], options);
  await spawn('git', ['config', 'user.name', 'Your Name'], options);

  // ignore any global .gitignore that will mess with us
  await spawn('git', ['config', 'core.excludesfile', 'false'], options);

  // this global setting messes with diffs
  // https://github.com/ember-cli/ember-cli-update/issues/995
  await spawn('git', ['config', 'diff.noprefix', 'false'], options);
}

module.exports = gitInit;
module.exports.gitConfigInit = gitConfigInit;
