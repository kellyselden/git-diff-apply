'use strict';

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const debug = require('debug')('git-diff-apply');

module.exports = async function run(command, options) {
  debug(command);
  let { stdout } = await exec(command, options);
  debug(stdout);
  return stdout.trim();
};
