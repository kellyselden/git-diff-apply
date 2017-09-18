'use strict';

module.exports = function getSubDir(root) {
  let subDir = process.cwd().substr(root.length + 1);
  return subDir;
};
