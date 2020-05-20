'use strict';

const { execaCommand } = require('./run');
const gitInit = require('./git-init');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);

module.exports = async function createCustomRemote({
  startCommand,
  endCommand,
  startTag,
  endTag,
  reset,
  init
}) {
  let cwd = await tmpDir();

  await gitInit({
    cwd
  });

  // If one tag is CRLF and the other LF, the diff becomes unusable.
  // This will work around that,
  await execaCommand('git config core.autocrlf true', {
    cwd
  });

  if (!(reset || init)) {
    await execaCommand(startCommand, {
      cwd
    });

    await commitAndTag(startTag, {
      cwd
    });

    await gitRemoveAll({
      cwd
    });
  }

  await execaCommand(endCommand, {
    cwd
  });

  await commitAndTag(endTag, {
    cwd
  });

  return cwd;
};
