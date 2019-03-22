'use strict';

const co = require('co');
const run = require('./run');
const gitInit = require('./git-init');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const denodeify = require('denodeify');
const tmpDir = denodeify(require('tmp').dir);

module.exports = co.wrap(function* createCustomRemote({
  startCommand,
  endCommand,
  startTag,
  endTag
}) {
  let cwd = yield tmpDir();

  gitInit({
    cwd
  });

  run(startCommand, {
    cwd
  });

  commitAndTag(startTag, {
    cwd
  });

  yield gitRemoveAll({
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
