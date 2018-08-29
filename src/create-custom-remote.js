'use strict';

const run = require('./run');
const gitInit = require('./git-init');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const denodeify = require('denodeify');
const tmpDir = denodeify(require('tmp').dir);

module.exports = function createCustomRemote({
  startCommand,
  endCommand,
  startTag,
  endTag
}) {
  return tmpDir().then(cwd => {
    gitInit({
      cwd
    });

    run(startCommand, {
      cwd
    });

    commitAndTag(startTag, {
      cwd
    });

    gitRemoveAll({
      cwd
    });

    run(endCommand, {
      cwd
    });

    commitAndTag(endTag, {
      cwd
    });

    return cwd;
  });
};
