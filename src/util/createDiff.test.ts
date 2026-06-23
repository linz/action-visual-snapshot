import { promises as fs } from 'fs';
import * as assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import os from 'os';
import path from 'path';

import { createDiff } from './createDiff.ts';

const __dirname = import.meta.dirname;
const FIXTURES = path.resolve(__dirname, '__fixtures__/imgs');

let tmpDir: string;

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('createDiff (integration)', function () {
  beforeEach(async function () {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'createDiff-test-'));
  });

  it('returns 0 and writes no file when images are identical', async function () {
    const file = path.join(FIXTURES, 'base/acceptance/test.png');
    const result = await createDiff('test.png', tmpDir, file, file);

    assert.equal(result, 0);
    assert.equal(await fileExists(path.join(tmpDir, 'test.png')), false);
  });

  it('returns non-zero and writes a diff PNG when images differ', async function () {
    const base = path.join(FIXTURES, 'base/acceptance/test.png');
    const current = path.join(FIXTURES, 'current/acceptance/test.png');
    const result = await createDiff('test.png', tmpDir, base, current);

    assert.ok(result > 0);
    assert.ok(await fileExists(path.join(tmpDir, 'test.png')));
  });

  it('creates output directory if it does not exist', async function () {
    const base = path.join(FIXTURES, 'base/acceptance/test.png');
    const current = path.join(FIXTURES, 'current/acceptance/test.png');
    const newOutput = path.join(tmpDir, 'new-subdir');

    const result = await createDiff('test.png', newOutput, base, current);

    assert.ok(result > 0);
    assert.ok(await fileExists(path.join(newOutput, 'test.png')));
  });

  it('written diff file is a valid PNG', async function () {
    const base = path.join(FIXTURES, 'base/acceptance/test.png');
    const current = path.join(FIXTURES, 'current/acceptance/test.png');
    await createDiff('test.png', tmpDir, base, current);

    const buf = await fs.readFile(path.join(tmpDir, 'test.png'));
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50); // 'P'
    assert.equal(buf[2], 0x4e); // 'N'
    assert.equal(buf[3], 0x47); // 'G'
  });
});
