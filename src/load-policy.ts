export const MAX_SOUNDING_BLOBS = 12;

const MAX_PATH_SEGMENTS = 210;
const MIN_PATH_SEGMENTS = 32;
const TARGET_TOTAL_PATH_SEGMENTS = 2_400;

export function shouldCreateVoice(soundingBlobCount: number): boolean {
  return soundingBlobCount < MAX_SOUNDING_BLOBS;
}

export function pathSegmentCount(blobCount: number): number {
  const safeBlobCount = Math.max(1, blobCount);
  return Math.max(
    MIN_PATH_SEGMENTS,
    Math.min(
      MAX_PATH_SEGMENTS,
      Math.floor(TARGET_TOTAL_PATH_SEGMENTS / safeBlobCount),
    ),
  );
}
