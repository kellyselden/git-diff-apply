'use strict';

const detachedRegex = /^HEAD detached at/m;
const cleanRegex = /^nothing to commit, working tree clean$/m;

module.exports = function(output) {
  return !!(
    !output.match(detachedRegex) &&
    output.match(cleanRegex)
  );
};
