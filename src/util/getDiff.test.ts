import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'path';

import { PNG } from 'pngjs';

import { getDiff } from './getDiff.ts';

const __dirname = import.meta.dirname;
const FIXTURES = path.resolve(__dirname, '__fixtures__/imgs');

function makeSolidPng(width: number, height: number, r: number, g: number, b: number, a = 255): PNG {
    const png = new PNG({ width, height });
    for (let i = 0; i < width * height; i++) {
        png.data[i * 4] = r;
        png.data[i * 4 + 1] = g;
        png.data[i * 4 + 2] = b;
        png.data[i * 4 + 3] = a;
    }
    return png;
}

describe('getDiff', function () {
    it('returns zero diff for identical PNG objects', async function () {
        const img = makeSolidPng(4, 4, 100, 150, 200);
        const { result, diff, img1, img2 } = await getDiff(img, img);

        assert.equal(result, 0);
        assert.equal(diff.width, 4);
        assert.equal(diff.height, 4);
        assert.equal(img1, img);
        assert.equal(img2, img);
    });

    it('returns non-zero diff for completely different PNGs', async function () {
        const red = makeSolidPng(2, 2, 255, 0, 0);
        const blue = makeSolidPng(2, 2, 0, 0, 255);
        const { result } = await getDiff(red, blue);

        assert.ok(result > 0);
    });

    it('diff output dimensions equal max of the two inputs', async function () {
        const small = makeSolidPng(2, 2, 0, 0, 0);
        const large = makeSolidPng(4, 6, 255, 255, 255);
        const { diff } = await getDiff(small, large);

        assert.equal(diff.width, 4);
        assert.equal(diff.height, 6);
    });

    it('resizes images when dimensions differ', async function () {
        const small = makeSolidPng(2, 2, 0, 0, 0);
        const large = makeSolidPng(4, 4, 0, 0, 0);
        const { img1, img2 } = await getDiff(small, large);

        assert.equal(img1.width, 4);
        assert.equal(img1.height, 4);
        assert.equal(img2.width, 4);
        assert.equal(img2.height, 4);
    });

    it('accepts file paths and loads them as PNGs', async function () {
        const file = path.join(FIXTURES, 'base/acceptance/test.png');
        const { result, img1, img2, diff } = await getDiff(file, file);

        assert.equal(result, 0);
        assert.ok(img1.width > 0);
        assert.ok(img2.width > 0);
        assert.equal(diff.width, img1.width);
        assert.equal(diff.height, img1.height);
    });

    it('detects differences between two real fixture images', async function () {
        const base = path.join(FIXTURES, 'base/acceptance/test.png');
        const current = path.join(FIXTURES, 'current/acceptance/test.png');
        const { result } = await getDiff(base, current);

        assert.ok(result > 0);
    });

    it('handles different-sized fixture images', async function () {
        const base = path.join(FIXTURES, 'base/acceptance/test.png');
        const size = path.join(FIXTURES, 'size/acceptance/test.png');
        const { diff, img1, img2 } = await getDiff(base, size);

        const expectedWidth = Math.max(img1.width, img2.width);
        const expectedHeight = Math.max(img1.height, img2.height);
        assert.equal(diff.width, expectedWidth);
        assert.equal(diff.height, expectedHeight);
    });

    it('respects threshold option — high threshold yields fewer diffs', async function () {
        const base = path.join(FIXTURES, 'base/acceptance/test.png');
        const current = path.join(FIXTURES, 'current/acceptance/test.png');

        const { result: strictResult } = await getDiff(base, current, { threshold: 0.01 });
        const { result: looseResult } = await getDiff(base, current, { threshold: 0.9 });

        assert.ok(strictResult >= looseResult);
    });
});
