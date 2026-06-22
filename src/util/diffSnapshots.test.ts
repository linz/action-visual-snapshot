import { promises as fs } from 'fs';
import * as assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import path from 'path';

import * as io from '@actions/io';

import { diffSnapshots } from './diffSnapshots.ts';

const __dirname = import.meta.dirname;
const RESULTS_PATH = path.resolve(__dirname, '__results');

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Note: @actions/core is imported within diffSnapshots. We let it run normally;
// it will just output standard Github Actions format commands to stdout if any.
describe('diffSnapshots (integration)', function () {
  beforeEach(async function () {
    await io.rmRF(RESULTS_PATH);
  });

  it('can diff snapshots', async function () {
    const diffResults = await diffSnapshots({
      basePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'base'),
      mergeBasePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'mergeBase'),
      currentPath: path.resolve(__dirname, '__fixtures__', 'imgs', 'current'),
      outputPath: path.resolve(RESULTS_PATH),
    });

    assert.deepEqual(Array.from(diffResults.changedSnapshots).sort(), ['acceptance/test.png']);
    assert.deepEqual(Array.from(diffResults.missingSnapshots).sort(), ['acceptance/both-base.png']);
    assert.deepEqual(Array.from(diffResults.newSnapshots).sort(), ['acceptance/added-in-current.png']);
    assert.deepEqual(
      Array.from(diffResults.potentialFlakes).sort(),
      ['acceptance/current-and-merge-base.png', 'acceptance/only-base.png'].sort(),
    );

    // Things should exist
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'diffs', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'merged', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'changed', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'original', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'missing', 'acceptance', 'both-base.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'new', 'acceptance', 'added-in-current.png')));
  });

  it('can diff snapshots without merge base', async function () {
    const diffResults = await diffSnapshots({
      basePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'base'),
      mergeBasePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'invalidMergeBase'),
      currentPath: path.resolve(__dirname, '__fixtures__', 'imgs', 'current'),
      outputPath: path.resolve(RESULTS_PATH),
    });

    assert.deepEqual(Array.from(diffResults.changedSnapshots).sort(), ['acceptance/test.png']);
    assert.deepEqual(
      Array.from(diffResults.missingSnapshots).sort(),
      ['acceptance/both-base.png', 'acceptance/only-base.png'].sort(),
    );
    assert.deepEqual(
      Array.from(diffResults.newSnapshots).sort(),
      ['acceptance/added-in-current.png', 'acceptance/current-and-merge-base.png'].sort(),
    );
    assert.deepEqual(Array.from(diffResults.potentialFlakes).sort(), []);

    // Things should exist
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'diffs', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'changed', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'original', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'missing', 'acceptance', 'both-base.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'missing', 'acceptance', 'only-base.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'new', 'acceptance', 'added-in-current.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'new', 'acceptance', 'current-and-merge-base.png')));
  });

  it('diffs different sized snapshots', async function () {
    const diffResults = await diffSnapshots({
      basePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'base'),
      mergeBasePath: path.resolve(__dirname, '__fixtures__', 'imgs', 'mergeBase'),
      currentPath: path.resolve(__dirname, '__fixtures__', 'imgs', 'size'),
      outputPath: path.resolve(RESULTS_PATH),
      pixelmatchOptions: { threshold: 0.05, includeAA: false, alpha: 0.1 },
    });

    assert.deepEqual(Array.from(diffResults.changedSnapshots).sort(), ['acceptance/test.png']);
    assert.deepEqual(Array.from(diffResults.missingSnapshots).sort(), ['acceptance/both-base.png']);
    assert.deepEqual(Array.from(diffResults.newSnapshots).sort(), []);
    assert.deepEqual(Array.from(diffResults.potentialFlakes).sort(), ['acceptance/only-base.png']);

    // Things should exist
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'diffs', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'changed', 'acceptance', 'test.png')));
    assert.ok(await fileExists(path.resolve(RESULTS_PATH, 'missing', 'acceptance', 'both-base.png')));
  });
});
