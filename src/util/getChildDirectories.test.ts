import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getChildDirectories } from './getChildDirectories.ts';

describe('getChildDirectories', function () {
  it('gets the directories to a file', function () {
    assert.deepEqual(
      getChildDirectories([
        [
          '/home/tmp/root',
          [
            '/home/tmp/root/file.png',
            '/home/tmp/root/a/deep/directory/file.png',
            '/home/tmp/root/a/deep/directory/file.png',
            '/home/tmp/root/another/deep/directory/file.png',
          ],
        ],
      ]),
      new Set(['a/deep/directory', 'another/deep/directory']),
    );
  });
});
