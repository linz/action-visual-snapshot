import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { copyPixel } from './copyPixel.ts';

const PNG_DATA = [255, 255, 255, 1, 255, 0, 0, 1, 255, 0, 0, 1, 255, 255, 255, 1];

describe('copyPixel', function () {
  it('can copy a pixel', function () {
    const mockPng = {
      width: 2,
      height: 2,
      data: PNG_DATA,
    };

    const target = { data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };

    // @ts-ignore
    copyPixel(4, mockPng, target);

    assert.deepEqual(target.data, [0, 0, 0, 0, 255, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
