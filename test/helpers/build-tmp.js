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

  gitInit({
    cwd: tmpPath
  });

  let tags = fs.readdirSync(fixturesPath);

  for (let i = 0; i < tags.length; i++) {
    if (i !== 0) {
      run('git rm -r *', {
        cwd: tmpPath
      });
    }

    let tag = tags[i];

    fs.copySync(path.join(fixturesPath, tag), tmpPath);

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
