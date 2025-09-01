'use strict';

const { exec, spawn } = require('./run');
const gitInit = require('./git-init');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const { createTmpDir } = require('./tmp');

module.exports = async function createCustomRemote({
  startCommand,
  endCommand,
  startTag,
  endTag,
  reset,
  init,
}) {
  let cwd = await createTmpDir();

  await gitInit({
    cwd,
  });

  // If one tag is CRLF and the other LF, the diff becomes unusable.
  // This will work around that,
  await spawn('git', ['config', 'core.autocrlf', 'true'], {
    cwd,
  });

  if (!(reset || init)) {
    await exec(startCommand, {
      cwd,
    });

    await commitAndTag(startTag, {
      cwd,
    });

    await gitRemoveAll({
      cwd,
    });
  }

  await exec(endCommand, {
    cwd,
  });

  await commitAndTag(endTag, {
    cwd,
  });

  return cwd;
};
