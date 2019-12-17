'use strict';

const { spawn } = require('child_process');
const debug = require('debug')('git-diff-apply');

const run = async function run(command, options = {}) {
  // Matches the shell-enabled behaviour of child_process.exec, which this
  // function previously used to run the specified command. This avoids
  // problems when handling quotes and whitespace.
  options.shell = true;
  debug(command);
  let [cmd, ...args] = command.split(' ');
  let stdout = await runWithSpawn(cmd, args, options);
  debug(stdout);
  return stdout;
};

const runWithSpawn = async function runWithSpawn(cmd, args, options) {
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
        resolve(stdout);
      } else {
        reject(new Error(`${command} failed with message ${errorMessage}`));
      }
    });
  });
};

module.exports = run;
module.exports.runWithSpawn = runWithSpawn;
