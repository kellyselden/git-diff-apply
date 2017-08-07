'use strict';

const expect = require('chai').expect;
const copyRegex = require('../../src/copy-regex');

describe('Unit - copy-regex', function() {
  it('exludes git files', function() {
    expect('git').to.match(copyRegex);
    expect('.git').to.not.match(copyRegex);
    expect('.git/').to.not.match(copyRegex);
    expect('.git/x').to.not.match(copyRegex);
    expect('.gitignore').to.match(copyRegex);
    expect('foo.git').to.not.match(copyRegex);
    expect('bar/.git').to.not.match(copyRegex);
  });

  it('includes everything else', function() {
    expect('foo/bar').to.match(copyRegex);
  });
});
