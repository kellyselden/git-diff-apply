'use strict';

const { promisify } = require('util');
const { exec } = require('child_process');
const execa = require('execa');
const debug = require('debug')('git-diff-apply');
const execPromise = promisify(exec);

module.exports = async function execaCommand(command, options) {
  debug(command);
  let { stdout } = await execPromise(command, options);
  debug(stdout);
  return stdout;
};

module.exports.execaCommand = async function execaCommand(command, options) {
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
