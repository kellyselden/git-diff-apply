'use strict';

const { expect } = require('chai');
const copyRegex = require('../../src/copy-regex');

describe('Unit - copy-regex', function() {
  it('exludes git files', function() {
    expect('git').to.match(copyRegex);
    expect('.git').to.not.match(copyRegex);
    expect('.git/').to.not.match(copyRegex);
    expect('.git\\').to.not.match(copyRegex);
    expect('.git/foo').to.not.match(copyRegex);
    expect('.git\\foo').to.not.match(copyRegex);
    expect('.gitignore').to.match(copyRegex);
    expect('foo.git').to.match(copyRegex);
    expect('foo/.git').to.not.match(copyRegex);
    expect('foo\\.git').to.not.match(copyRegex);
  });

  it('exludes node_modules', function() {
    expect('node_modules').to.not.match(copyRegex);
    expect('node_moduless').to.match(copyRegex);
    expect('nnode_modules').to.match(copyRegex);
    expect('node_modules/foo').to.not.match(copyRegex);
    expect('node_modules\\foo').to.not.match(copyRegex);
    expect('foo/node_modules').to.not.match(copyRegex);
    expect('foo\\node_modules').to.not.match(copyRegex);
  });

  it('includes everything else', function() {
    expect('foo/bar').to.match(copyRegex);
    expect('foo\\bar').to.match(copyRegex);
  });
});
