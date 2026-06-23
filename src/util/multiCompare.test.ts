import { promises as fs } from 'fs';
import * as assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import os from 'os';
import path from 'path';

import { multiCompare } from './multiCompare.ts';

const __dirname = import.meta.dirname;
const FIXTURES = path.resolve(__dirname, '__fixtures__/imgs');

let tmpDiff: string;
let tmpMerged: string;

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('multiCompare (integration)', function () {
  beforeEach(async function () {
    tmpDiff = await fs.mkdtemp(path.join(os.tmpdir(), 'multiCompare-diff-'));
    tmpMerged = await fs.mkdtemp(path.join(os.tmpdir(), 'multiCompare-merged-'));
  });

  it('returns non-zero and writes diff file when branch head differs from base head', async function () {
    const result = await multiCompare({
      snapshotName: 'test.png',
      branchBase: path.join(FIXTURES, 'mergeBase/acceptance/test.png'),
      baseHead: path.join(FIXTURES, 'base/acceptance/test.png'),
      branchHead: path.join(FIXTURES, 'current/acceptance/test.png'),
      outputDiffPath: tmpDiff,
      outputMergedPath: tmpMerged,
    });

    assert.ok(result > 0);
    assert.ok(await fileExists(path.join(tmpDiff, 'test.png')));
  });

  it('returns zero and writes no diff file when images are identical', async function () {
    const same = path.join(FIXTURES, 'base/acceptance/test.png');
    const result = await multiCompare({
      snapshotName: 'test.png',
      branchBase: same,
      baseHead: same,
      branchHead: same,
      outputDiffPath: tmpDiff,
      outputMergedPath: tmpMerged,
    });

    assert.equal(result, 0);
    assert.equal(await fileExists(path.join(tmpDiff, 'test.png')), false);
  });

  it('writes a merged PNG when branchBase and baseHead differ', async function () {
    const result = await multiCompare({
      snapshotName: 'test.png',
      branchBase: path.join(FIXTURES, 'mergeBase/acceptance/test.png'),
      baseHead: path.join(FIXTURES, 'base/acceptance/test.png'),
      branchHead: path.join(FIXTURES, 'current/acceptance/test.png'),
      outputDiffPath: tmpDiff,
      outputMergedPath: tmpMerged,
    });

    // A merge was needed (branchBase !== baseHead), so merged file should exist
    assert.ok(result >= 0);
    assert.ok(await fileExists(path.join(tmpMerged, 'test.png')));
  });

  it('written diff and merged files are valid PNGs', async function () {
    await multiCompare({
      snapshotName: 'test.png',
      branchBase: path.join(FIXTURES, 'mergeBase/acceptance/test.png'),
      baseHead: path.join(FIXTURES, 'base/acceptance/test.png'),
      branchHead: path.join(FIXTURES, 'current/acceptance/test.png'),
      outputDiffPath: tmpDiff,
      outputMergedPath: tmpMerged,
    });

    for (const filePath of [path.join(tmpDiff, 'test.png'), path.join(tmpMerged, 'test.png')]) {
      const buf = await fs.readFile(filePath);
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50); // 'P'
      assert.equal(buf[2], 0x4e); // 'N'
      assert.equal(buf[3], 0x47); // 'G'
    }
  });
});
