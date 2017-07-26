'use strict';

const path = require('path');
const expect = require('chai').expect;
const cp = require('child_process');
const fs = require('fs-extra');
const fixturify = require('fixturify');
const run = require('../src/run');

function gitInit(cwd) {
  run('git init', {
    cwd
  });

  run('git config user.email "you@example.com"', {
    cwd
  });

  run('git config user.name "Your Name"', {
    cwd
  });

  run('git config merge.tool "vimdiff"', {
    cwd
  });

  run('git config mergetool.keepBackup false', {
    cwd
  });
}

function buildTmp(
  fixturesPath,
  tmpPath
) {
  gitInit(tmpPath);

  let tags = fs.readdirSync(fixturesPath);

  for (let i = 0; i < tags.length; i++) {
    if (i !== 0) {
      run('git rm -r *', {
        cwd: tmpPath
      });
    }

    let tag = tags[i];

    fs.copySync(path.join(fixturesPath, tag), tmpPath);

    run('git add -A', {
      cwd: tmpPath
    });

    run(`git commit -m "${tag}"`, {
      cwd: tmpPath
    });

    run(`git tag ${tag}`, {
      cwd: tmpPath
    });
  }
}

function fixtureCompare(mergeFixtures) {
  let actual = fixturify.readSync('tmp/local');
  let expected = fixturify.readSync(mergeFixtures);

  delete actual['.git'];

  expect(actual).to.deep.equal(expected);

  let result = run('git log -1', {
    cwd: 'tmp/local'
  });

  expect(result).to.contain('Author: Your Name <you@example.com>');
  expect(result).to.contain('v1-v3');
  expect(result).to.not.contain('local');
}

describe('test', function() {
  this.timeout(30000);

  let cwd;

  before(function() {
    cwd = process.cwd();
  });

  beforeEach(function() {
    fs.emptyDirSync('tmp/local');
    fs.emptyDirSync('tmp/remote');

    buildTmp(
      'test/fixtures/local',
      'tmp/local'
    );
  });

  function merge(
    remoteFixtures,
    abort
  ) {
    buildTmp(
      remoteFixtures,
      'tmp/remote'
    );

    let binFile = path.join(cwd, 'bin/git-diff-apply');

    return new Promise(resolve => {
      let ps = cp.spawn('node', [
        binFile,
        '--remote-name',
        'origin',
        '--remote-url',
        path.join(cwd, 'tmp/remote'),
        '--start-tag',
        'v1',
        '--end-tag',
        'v3'
      ], {
        cwd: 'tmp/local',
        env: process.env
      });

      ps.stdout.on('data', data => {
        let str = data.toString();
        if (str.includes('Normal merge conflict')) {
          if (abort) {
            ps.stdin.write(':qa!\n');
          } else {
            ps.stdin.write(':diffg 3\n');
            ps.stdin.write(':wqa\n');
          }
        } else if (str.includes('Deleted merge conflict')) {
          if (abort) {
            ps.stdin.write('a\n');
          } else {
            ps.stdin.write('d\n');
          }
        } else if (str.includes('Was the merge successful')) {
          ps.stdin.write('n\n');
        } else if (str.includes('Continue merging other unresolved paths')) {
          ps.stdin.write('n\n');
        }
      });

      let stderr = '';

      ps.stderr.on('data', data => {
        stderr += data.toString();
      });

      ps.stderr.pipe(process.stdout);

      ps.on('exit', () => {
        expect(stderr).to.not.contain('Error:');
        expect(stderr).to.not.contain('fatal:');
        expect(stderr).to.not.contain('Command failed');

        resolve(stderr);
      });
    });
  }

  it('handles conflicts', function() {
    return merge(
      'test/fixtures/remote-conflict'
    ).then(() => {
      fixtureCompare('test/fixtures/merge-conflict');
    });
  });

  it('handles no conflicts', function() {
    return merge(
      'test/fixtures/remote-noconflict'
    ).then(() => {
      fixtureCompare('test/fixtures/merge-noconflict');
    });
  });

  it('handles aborts', function() {
    return merge(
      'test/fixtures/remote-conflict',
      true
    ).then((/* stderr */) => {
      let actual = fixturify.readSync('tmp/local');

      expect(actual['changed.txt']).to.contain('<<<<<<< HEAD');

      let result = run('git log -1', {
        cwd: 'tmp/local'
      });

      expect(result).to.contain('Author: Your Name <you@example.com>');
      expect(result).to.contain('local');
      expect(result).to.not.contain('v1-v3');

      // expect(stderr).to.contain('merge of changed.txt failed');
    });
  });
});
