'use strict';

const expect = require('chai').expect;
const isGitClean = require('../../src/is-git-clean');

describe('Unit - is-git-clean', function() {
  it('detects clean', function() {
    expect(isGitClean('')).to.be.true;
  });

  it('detects dirty', function() {
    expect(isGitClean(`?? jkladsfjl
`)).to.be.false;
  });
});
