'use strict';

const execa = require('execa');
const debug = require('debug')('git-diff-apply');

module.exports = async function run(command, options) {
  debug(command);
  let { stdout } = await execa.command(command, options);
  debug(stdout);
  return stdout;
};

module.exports.runWithSpawn = async function runWithSpawn(cmd, args, options) {
  let command = [cmd, ...args].join(' ');
  debug(command);
  let { stdout } = await execa(cmd, args, options);
  debug(stdout);
  return stdout;
};
