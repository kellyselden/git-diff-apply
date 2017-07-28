'use strict';

const path = require('path');
const expect = require('chai').expect;
const cp = require('child_process');
const fs = require('fs-extra');
const fixturify = require('fixturify');
const run = require('../src/run');
// const debug = require('debug')('git-diff-apply');

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

  // run('git config core.autocrlf input', {
  //   cwd
  // });

  // run('git config core.eol lf', {
  //   cwd
  // });

  // run('echo "* text=auto" > .gitattributes', {
  //   cwd
  // });

  // run('cat .gitattributes', {
  //   cwd
  // });

  // run('git add -A', {
  //   cwd
  // });

  // run('git commit -m ".gitattributes"', {
  //   cwd
  // });
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

    // let files = fixturify.readSync(tmpPath);
    // delete files['.git'];
    // debug(files);
  }
}

function fixtureCompare(mergeFixtures) {
  let actual = fixturify.readSync('tmp/local');
  let expected = fixturify.readSync(mergeFixtures);

  delete actual['.git'];

  expect(actual).to.deep.equal(expected);
}

describe('Acceptance', function() {
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
        // '--remote-name',
        // 'origin',
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

      ps.once('exit', () => {
        let status = run('git status', {
          cwd: 'tmp/local'
        });

        expect(stderr).to.not.contain('Error:');
        expect(stderr).to.not.contain('fatal:');
        expect(stderr).to.not.contain('Command failed');

        let result = run('git log -1', {
          cwd: 'tmp/local'
        });

        // verify it is not committed
        expect(result).to.contain('Author: Your Name <you@example.com>');
        expect(result).to.contain('local');

        result = run('git branch', {
          cwd: 'tmp/local'
        });

        // verify branch was deleted
        expect(result.trim()).to.contain('* master');

        // if (!abort) {
        //   // needed on Windows to convert crlf to lf
        //   run('git commit -m "merge"', {
        //     cwd: 'tmp/local'
        //   });
        // }

        resolve({
          status,
          stderr
        });
      });
    });
  }

  it('handles conflicts', function() {
    return merge(
      'test/fixtures/remote/conflict'
    ).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/conflict');

      expect(status).to.contain('new file:   added-changed.txt');
      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('modified:   present-added-changed.txt');
      expect(status).to.contain('modified:   present-changed.txt');
      expect(status).to.contain('deleted:    removed-changed.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');
    });
  });

  it('handles no conflicts', function() {
    return merge(
      'test/fixtures/remote/noconflict',
      true
    ).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/noconflict');

      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('modified:   present-changed.txt');
      expect(status).to.contain('modified:   removed-changed.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');
    });
  });

  it('handles aborts', function() {
    return merge(
      'test/fixtures/remote/conflict',
      true
    ).then(result => {
      let status = result.status;
      // let stderr = result.stderr;

      let actual = fs.readFileSync('tmp/local/present-changed.txt', 'utf8');

      expect(actual).to.contain('<<<<<<< HEAD');

      expect(status).to.contain('new file:   added-changed.txt');
      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');

      expect(status).to.contain('deleted by us:   missing-changed.txt');
      expect(status).to.contain('both added:      present-added-changed.txt');
      expect(status).to.contain('both modified:   present-changed.txt');
      expect(status).to.contain('deleted by them: removed-changed.txt');

      // expect(stderr).to.contain('merge of present-changed.txt failed');
    });
  });
});
