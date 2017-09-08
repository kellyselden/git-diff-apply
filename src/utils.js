'use strict';

const denodeify = require('denodeify');
const ncp = denodeify(require('ncp'));
const run = require('./run');

module.exports.copy = ncp;
module.exports.run = run;
