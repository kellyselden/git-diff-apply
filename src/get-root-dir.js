'use strict';

const { spawn } = require('./run');

module.exports = async function getRootDir(options) {
  let root = (await spawn('git', ['rev-parse', '--show-toplevel'], options)).trim();
  return root;
};
