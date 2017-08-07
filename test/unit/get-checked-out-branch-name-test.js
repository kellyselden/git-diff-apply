'use strict';

const expect = require('chai').expect;
const getCheckedOutBranchName = require('../../src/get-checked-out-branch-name');

describe('Unit - get-checked-out-branch-name', function() {
  it('works in the middle', function() {
    expect(getCheckedOutBranchName(`
foo
* bar
master`)).to.equal('bar');
  });

  it('works at the beginning with a newline', function() {
    expect(getCheckedOutBranchName(`
* foo
bar
master`)).to.equal('foo');
  });

  it('works at the beginning without a newline', function() {
    expect(getCheckedOutBranchName(`* foo
bar
master`)).to.equal('foo');
  });

  it('works at the end with a newline', function() {
    expect(getCheckedOutBranchName(`
foo
bar
* master
`)).to.equal('master');
  });

  it('works at the end without a newline', function() {
    expect(getCheckedOutBranchName(`
foo
bar
* master`)).to.equal('master');
  });

  it('handles orphans', function() {
    expect(getCheckedOutBranchName(`
foo
bar
master`)).to.equal('');
  });
});
