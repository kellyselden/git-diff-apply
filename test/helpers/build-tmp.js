'use strict';

const path = require('path');
const fs = require('fs-extra');
const gitFixtures = require('git-fixtures');
const run = require('../../src/run');

const gitInit = gitFixtures.gitInit;
const commit = gitFixtures.commit;
const postCommit = gitFixtures.postCommit;

module.exports = function(options) {
  let fixturesPath = options.fixturesPath;
  let tmpPath = options.tmpPath;
  let dirty = options.dirty;
  let subDir = options.subDir || '';

  gitInit({
    cwd: tmpPath
  });

  let tmpSubPath = path.join(tmpPath, subDir);

  let tags = fs.readdirSync(fixturesPath);

  for (let i = 0; i < tags.length; i++) {
    if (i !== 0) {
      run('git rm -r *', {
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
