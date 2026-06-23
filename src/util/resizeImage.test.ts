import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PNG } from 'pngjs';

import { resizeImage } from './resizeImage.ts';

function makePng(width: number, height: number, fill: number[] = []): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i++) {
    png.data[i] = fill[i] ?? 128;
  }
  return png;
}

describe('resizeImage', function () {
  it('returns the same image when dimensions match', function () {
    const img = makePng(2, 2);
    const result = resizeImage(img, 2, 2);
    assert.equal(result, img);
  });

  it('expands image width with transparent padding', function () {
    const img = makePng(1, 1);
    img.data[0] = 255; // R
    img.data[1] = 0; // G
    img.data[2] = 0; // B
    img.data[3] = 255; // A

    const result = resizeImage(img, 2, 1);

    assert.equal(result.width, 2);
    assert.equal(result.height, 1);

    // original pixel preserved
    assert.equal(result.data[0], 255);
    assert.equal(result.data[1], 0);
    assert.equal(result.data[2], 0);
    assert.equal(result.data[3], 255);

    // new pixel is transparent
    assert.equal(result.data[4], 0);
    assert.equal(result.data[5], 0);
    assert.equal(result.data[6], 0);
    assert.equal(result.data[7], 0);
  });

  it('expands image height with transparent padding', function () {
    const img = makePng(1, 1);
    img.data[0] = 0;
    img.data[1] = 255;
    img.data[2] = 0;
    img.data[3] = 255;

    const result = resizeImage(img, 1, 2);

    assert.equal(result.width, 1);
    assert.equal(result.height, 2);

    // original pixel preserved
    assert.equal(result.data[0], 0);
    assert.equal(result.data[1], 255);
    assert.equal(result.data[2], 0);
    assert.equal(result.data[3], 255);

    // new pixel is transparent
    assert.equal(result.data[4], 0);
    assert.equal(result.data[5], 0);
    assert.equal(result.data[6], 0);
    assert.equal(result.data[7], 0);
  });

  it('produces a new PNG object when resizing', function () {
    const img = makePng(1, 1);
    const result = resizeImage(img, 2, 2);
    assert.notEqual(result, img);
  });
});
