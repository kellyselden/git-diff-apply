'use strict';

const expect = require('chai').expect;
const isGitClean = require('../../src/is-git-clean');

describe('Unit - is-git-clean', function() {
  it('detects detached head', function() {
    expect(isGitClean(`
HEAD detached at 7036c83
nothing to commit, working tree clean
`)).to.be.false;
  });

  it('detects clean', function() {
    expect(isGitClean(`
On branch master
Your branch is up-to-date with 'origin/master'.

nothing to commit, working tree clean
`)).to.be.true;
  });

  it('detects dirty', function() {
    expect(isGitClean(`
On branch master
Your branch is up-to-date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)
`)).to.be.false;
  });
});
