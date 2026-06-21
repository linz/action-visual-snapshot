import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PNG } from 'pngjs';

import { findChangedPixels } from './findChangedPixels.ts';

const PNG_DATA = [255, 255, 255, 1, 255, 0, 0, 1, 255, 0, 0, 1, 255, 255, 255, 1];

describe('findChangedPixels', function () {
  it('finds two changed pixels', function () {
    const mockPng: Partial<PNG> = {
      width: 2,
      height: 2,
      data: Buffer.from(PNG_DATA) as Buffer<ArrayBuffer>,
    };

    assert.deepEqual(findChangedPixels(mockPng as PNG), [4, 8]);
  });
});
