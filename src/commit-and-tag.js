'use strict';

const commit = require('./commit');
const { execaCommand } = require('./run');

module.exports = async function commitAndTag(tag, options) {
  await commit(tag, options);
  await execaCommand(`git tag ${tag}`, options);
};
