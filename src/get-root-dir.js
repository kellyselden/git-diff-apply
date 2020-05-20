'use strict';

const { execaCommand } = require('./run');

module.exports = async function getRootDir(options) {
  let root = await execaCommand('git rev-parse --show-toplevel', options);
  return root;
};
