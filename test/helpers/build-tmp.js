'use strict';

const path = require('path');
const fs = require('fs-extra');
const {
  gitInit,
  commit,
  postCommit
} = require('git-fixtures');
const gitRemoveAll = require('../../src/git-remove-all');

module.exports = function({
  fixturesPath,
  tmpPath,
  dirty,
  subDir = ''
}) {
  gitInit({
    cwd: tmpPath
  });

  let tmpSubPath = path.join(tmpPath, subDir);

  let tags = fs.readdirSync(fixturesPath);

  for (let i = 0; i < tags.length; i++) {
    if (i !== 0) {
      gitRemoveAll({
        cwd: tmpPath
      });
    }

    let tag = tags[i];

    fs.ensureDirSync(tmpSubPath);

    fs.copySync(path.join(fixturesPath, tag), tmpSubPath);

    commit({
      m: tag,
      tag,
      cwd: tmpPath
    });
  }

  postCommit({
    cwd: tmpPath,
    dirty
  });
};
