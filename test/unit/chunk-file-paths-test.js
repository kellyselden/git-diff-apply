'use strict';

const { describe, it } = require('../helpers/mocha');
const { expect } = require('../helpers/chai');
const { chunkFilePaths } = require('../../src/git-remove-all');
const filePaths = [
  'a'.repeat(5),
  'b'.repeat(4),
  'c'.repeat(2)
];

describe(chunkFilePaths, function() {
  it('divides the input into chunks', function() {
    let result = chunkFilePaths(filePaths, 6);
    expect(result).to.have.lengthOf(2);
    expect(result[0]).to.have.lengthOf(1);
    expect(result[0]).to.deep.equal([filePaths[0]]);
    expect(result[1]).to.have.lengthOf(2);
    expect(result[1]).to.deep.equal([filePaths[1], filePaths[2]]);
  });

  it('handles everything being in the same chunk', function() {
    let result = chunkFilePaths(filePaths, 1000);
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.deep.equal(filePaths);
  });

  it('handles when individual elements are bigger than the chunk size', function() {
    let result = chunkFilePaths(filePaths, 4);
    expect(result).to.have.lengthOf(3);
    expect(result[0]).to.deep.equal([filePaths[0]]);
    expect(result[1]).to.deep.equal([filePaths[1]]);
  });
});
