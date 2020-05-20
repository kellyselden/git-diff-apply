'use strict';

const fs = require('fs-extra');
const path = require('path');
const { runWithSpawn } = require('./run');

async function lsFiles(options) {
  // Using spawn rather than run here because ls-files produces a lot
  // of output if it gets run in a large repo.
  // See https://github.com/kellyselden/git-diff-apply/pull/277
  let files = (await runWithSpawn('git', ['ls-files'], options))
    .split(/\r?\n/g)
    .filter(Boolean);

  return files;
}

function chunkFilePaths(files, maxChunkSize = 4096) {
  let currentChunkLength = 0;
  let currentChunkIndex = 0;
  let chunkedOutput = [];

  files.forEach(file => {
    if (currentChunkLength + file.length <= maxChunkSize) {
      chunkedOutput[currentChunkIndex] = chunkedOutput[currentChunkIndex] || [];
      chunkedOutput[currentChunkIndex].push(file);
      currentChunkLength += file.length;
    } else {
      chunkedOutput.push([file]);
      currentChunkLength = file.length;
      currentChunkIndex += 1;
    }
  });

  return chunkedOutput;
}

module.exports = async function gitRemoveAll(options) {
  // this removes cwd as well, which trips up your terminal
  // when in a monorepo
  // await run('git rm -rf .', options);

  let files = await lsFiles(options);
  let fileGroups = chunkFilePaths(files);

  for (let files of fileGroups) {
    // this removes folders that become empty,
    // which we are trying to avoid
    // await run(`git rm -f "${file}"`, options);
    for (let file of files) {
      await fs.remove(path.join(options.cwd, file));
    }

    // force is needed to work around
    /**
     * Error: git add foo failed with message The following paths are ignored by one of your .gitignore files:
     * foo
     * Use -f if you really want to add them.
     */
    // https://github.com/kellyselden/git-diff-apply/issues/306
    await runWithSpawn('git', ['add', '-f', ...files], options);
  }
};

module.exports.chunkFilePaths = chunkFilePaths;
