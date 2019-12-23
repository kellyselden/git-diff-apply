'use strict';

const path = require('path');

module.exports = function getSubDir(root) {
  let subDir = path.relative(root, process.cwd());
  return subDir;
};
