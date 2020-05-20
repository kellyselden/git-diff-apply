'use strict';

const { promisify } = require('util');
const { exec, spawn } = require('child_process');
const debug = require('debug')('git-diff-apply');
const execPromise = promisify(exec);

module.exports = async function run(command, options) {
  debug(command);
  let { stdout } = await execPromise(command, options);
  debug(stdout);
  return stdout;
};

module.exports.runWithSpawn = async function runWithSpawn(cmd, args, options) {
  return await new Promise(function(resolve, reject) {
    let command = [cmd, ...args].join(' ');
    let stdout = '';
    let errorMessage = '';

    debug(command);

    let child = spawn(cmd, args, options);
    child.stdout.on('data', function(data) {
      stdout += data;
    });
    child.stderr.on('data', function(data) {
      errorMessage += data;
    });
    child.on('close', function(status) {
      if (status === 0) {
        debug(stdout);

        resolve(stdout);
      } else {
        reject(new Error(`${command} failed with message ${errorMessage}`));
      }
    });
  });
};
