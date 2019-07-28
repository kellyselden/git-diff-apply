'use strict';

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const execa = require('execa');
const debug = require('debug')('git-diff-apply');

module.exports = async function run(command, args, options) {
  debug(command);
  // let { stdout } = await exec(command, options);
  let { stdout } = await execa(command, args, options);
  debug(stdout);
  // return stdout.trim();
  return stdout;
};
