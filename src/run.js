'use strict';

const cp = require('child_process');
const debug = require('debug')('git-diff-apply');

module.exports = function run(command, options) {
  debug(command);
  let result = cp.execSync(command, options).toString();
  debug(result);
  return result;
};
