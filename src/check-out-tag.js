'use strict';

const { execaCommand } = require('./run');

module.exports = async function checkOutTag(tag, options) {
  let sha = await execaCommand(`git rev-parse ${tag}`, options);
  await execaCommand(`git checkout ${sha}`, options);
};
