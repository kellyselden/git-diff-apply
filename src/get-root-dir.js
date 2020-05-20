'use strict';

const { runWithSpawn } = require('./run');

module.exports = async function getRootDir(options) {
  let root = (await runWithSpawn('git', ['rev-parse', '--show-toplevel'], options)).trim();
  return root;
};
