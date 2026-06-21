import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDirectoriesToFile } from './getDirectoriesToFile.ts';

describe('getDirectoriesToFile', function () {
  it('gets the directories to a file', function () {
    assert.equal(
      getDirectoriesToFile('/home/tmp/root', '/home/tmp/root/a/deep/directory/file.png'),
      'a/deep/directory',
    );
  });
});
