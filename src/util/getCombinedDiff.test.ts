import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PNG } from 'pngjs';

import { getCombinedDiff } from './getCombinedDiff.ts';

function makeSolidPng(width: number, height: number, r: number, g: number, b: number, a: number): PNG {
    const png = new PNG({ width, height });
    for (let i = 0; i < width * height; i++) {
        png.data[i * 4] = r;
        png.data[i * 4 + 1] = g;
        png.data[i * 4 + 2] = b;
        png.data[i * 4 + 3] = a;
    }
    return png;
}

describe('getCombinedDiff', function () {
    it('combines three images side by side with tripled width', async function () {
        const img1 = makeSolidPng(2, 1, 255, 0, 0, 255); // red
        const img2 = makeSolidPng(2, 1, 0, 255, 0, 255); // green
        const diff = makeSolidPng(2, 1, 0, 0, 255, 255); // blue

        const result = await getCombinedDiff(img1, img2, diff);

        assert.equal(result.width, 6);
        assert.equal(result.height, 1);
    });

    it('copies img1 pixels into the first third of the combined image', async function () {
        const img1 = makeSolidPng(2, 1, 255, 0, 0, 255);
        const img2 = makeSolidPng(2, 1, 0, 255, 0, 255);
        const diff = makeSolidPng(2, 1, 0, 0, 255, 255);

        const result = await getCombinedDiff(img1, img2, diff);

        // first pixel of combined = first pixel of img1 (red)
        assert.equal(result.data[0], 255);
        assert.equal(result.data[1], 0);
        assert.equal(result.data[2], 0);
        assert.equal(result.data[3], 255);
    });

    it('copies img2 pixels into the second third of the combined image', async function () {
        const img1 = makeSolidPng(2, 1, 255, 0, 0, 255);
        const img2 = makeSolidPng(2, 1, 0, 255, 0, 255);
        const diff = makeSolidPng(2, 1, 0, 0, 255, 255);

        const result = await getCombinedDiff(img1, img2, diff);

        // pixel at x=2 (start of second panel) = first pixel of img2 (green)
        const secondPanelStart = 2 * 4;
        assert.equal(result.data[secondPanelStart], 0);
        assert.equal(result.data[secondPanelStart + 1], 255);
        assert.equal(result.data[secondPanelStart + 2], 0);
        assert.equal(result.data[secondPanelStart + 3], 255);
    });

    it('copies diff pixels into the third third of the combined image', async function () {
        const img1 = makeSolidPng(2, 1, 255, 0, 0, 255);
        const img2 = makeSolidPng(2, 1, 0, 255, 0, 255);
        const diff = makeSolidPng(2, 1, 0, 0, 255, 255);

        const result = await getCombinedDiff(img1, img2, diff);

        // pixel at x=4 (start of third panel) = first pixel of diff (blue)
        const thirdPanelStart = 4 * 4;
        assert.equal(result.data[thirdPanelStart], 0);
        assert.equal(result.data[thirdPanelStart + 1], 0);
        assert.equal(result.data[thirdPanelStart + 2], 255);
        assert.equal(result.data[thirdPanelStart + 3], 255);
    });
});
