'use strict';

const run = require('./run');

module.exports = function gitInit(options) {
  run('git init', options);
  run('git config user.email "you@example.com"', options);
  run('git config user.name "Your Name"', options);

  // ignore any global .gitignore that will mess with us
  run('git config --local core.excludesfile false', options);
};
