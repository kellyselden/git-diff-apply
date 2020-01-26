'use strict';

// node_modules should probably not be here to remain agnostic
module.exports = /^(?:(?!(^|[/\\])(?:\.git|node_modules)([/\\]|$)).)+$/;
