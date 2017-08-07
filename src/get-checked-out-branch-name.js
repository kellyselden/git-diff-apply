'use strict';

const regex = /^\* .*$/m;

module.exports = function(output) {
  let match = output.match(regex);
  if (!match) {
    return '';
  }

  return match[0].slice(2);
};
