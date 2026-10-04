import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SOUNDING_BLOBS,
  pathSegmentCount,
  shouldCreateVoice,
} from "../src/load-policy.ts";

test("audio work stays bounded during a large burst", () => {
  const sounding = Array.from({ length: 100 }, (_, index) =>
    shouldCreateVoice(index),
  ).filter(Boolean).length;

  assert.equal(sounding, MAX_SOUNDING_BLOBS);
  assert.ok(MAX_SOUNDING_BLOBS <= 12);
});

test("drawing work stays bounded as blob count rises", () => {
  const singleBlobWork = pathSegmentCount(1);
  const hundredBlobWork = pathSegmentCount(100) * 100;

  assert.ok(singleBlobWork >= 200);
  assert.ok(hundredBlobWork <= 3_200);
});
