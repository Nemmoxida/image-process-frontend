import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStem,
  getFileExtension,
  parseYoloText,
  classifyAndPairFiles,
  validateMetadata,
  calculateRoundRobinDistribution,
} from './validation';
import { TransformMetadata } from './augmentation-types';

// Mock File helper for Node environment
function createMockFile(name: string, sizeBytes: number = 1000): File {
  const content = 'mock content';
  const blob = new Blob([content]);
  const file = new File([blob], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

test('extractStem handles filenames with various extensions and paths', () => {
  assert.equal(extractStem('image_1.png'), 'image_1');
  assert.equal(extractStem('dataset/images/sample.01.jpg'), 'sample.01');
  assert.equal(extractStem('annotation.txt'), 'annotation');
  assert.equal(extractStem('no_extension'), 'no_extension');
});

test('getFileExtension returns lowercase extension without dot', () => {
  assert.equal(getFileExtension('image.PNG'), 'png');
  assert.equal(getFileExtension('file.JPEG'), 'jpeg');
  assert.equal(getFileExtension('annotation.txt'), 'txt');
  assert.equal(getFileExtension('nodot'), '');
});

test('parseYoloText parses valid normalized YOLO annotations', () => {
  const yoloContent = `
0 0.5 0.5 0.2 0.3
1 0.25 0.75 0.1 0.15
  `;
  const result = parseYoloText(yoloContent);
  assert.equal(result.valid, true);
  assert.equal(result.bboxes.length, 2);
  assert.deepEqual(result.bboxes[0], {
    classId: 0,
    xCenter: 0.5,
    yCenter: 0.5,
    width: 0.2,
    height: 0.3,
  });
});

test('parseYoloText rejects invalid tokens or out-of-bounds coordinates', () => {
  const badToken = '0 0.5 0.5'; // only 3 tokens
  assert.equal(parseYoloText(badToken).valid, false);

  const outOfBounds = '0 1.5 0.5 0.2 0.2'; // xCenter > 1
  assert.equal(parseYoloText(outOfBounds).valid, false);

  const negativeClass = '-1 0.5 0.5 0.2 0.2';
  assert.equal(parseYoloText(negativeClass).valid, false);
});

test('classifyAndPairFiles pairs images and annotations 1:1 by stem', () => {
  const files = [
    createMockFile('image_1.png'),
    createMockFile('image_1.txt'),
    createMockFile('image_2.jpg'),
    createMockFile('image_2.txt'),
  ];
  const res = classifyAndPairFiles(files);
  assert.equal(res.errors.length, 0);
  assert.equal(res.pairs.length, 2);
  assert.equal(res.hasAnnotations, true);
  assert.equal(res.pairs[0].annotationFile?.name, 'image_1.txt');
  assert.equal(res.pairs[1].annotationFile?.name, 'image_2.txt');
});

test('classifyAndPairFiles errors when an image is missing its annotation', () => {
  const files = [
    createMockFile('image_1.png'),
    createMockFile('image_1.txt'),
    createMockFile('image_2.png'), // missing image_2.txt
  ];
  const res = classifyAndPairFiles(files);
  assert.ok(res.errors.length > 0);
  assert.ok(res.errors[0].includes('Annotation mismatch'));
});

test('classifyAndPairFiles permits images without annotations if no annotations exist', () => {
  const files = [
    createMockFile('image_1.png'),
    createMockFile('image_2.jpg'),
  ];
  const res = classifyAndPairFiles(files);
  assert.equal(res.errors.length, 0);
  assert.equal(res.pairs.length, 2);
  assert.equal(res.hasAnnotations, false);
});

test('validateMetadata checks count limits and edit consistency', () => {
  const meta: TransformMetadata = {
    count: 10,
    ext: 'png',
    edits: [
      { action: 'rotate', range: { min: -10, max: 10 } },
      { action: 'brightness', range: { min: -20, max: 20 } },
    ],
    flip: { enabled: true, probability: 0.5 },
  };

  const validRes = validateMetadata(meta, 5);
  assert.equal(validRes.valid, true);

  // Error when count < edits.length
  const metaTooFew = { ...meta, count: 1 };
  assert.equal(validateMetadata(metaTooFew, 5).valid, false);

  // Error when edits is empty
  const metaEmpty = { ...meta, edits: [] };
  assert.equal(validateMetadata(metaEmpty, 5).valid, false);

  // Error when flip probability is out of 0..1
  const metaBadFlip = { ...meta, flip: { enabled: true, probability: 1.5 } };
  assert.equal(validateMetadata(metaBadFlip, 5).valid, false);
});

test('calculateRoundRobinDistribution matches API.md example', () => {
  // In API.md: count = 50, 3 edits -> 17, 17, 16
  const edits = [
    { action: 'rotate', range: { min: -5, max: 5 } },
    { action: 'randomCrop', randomCrop: { width: { min: 0.7, max: 1 }, height: { min: 0.7, max: 1 } } },
    { action: 'brightness', range: { min: -10, max: 10 } },
  ] as const;

  const distribution = calculateRoundRobinDistribution(50, edits as any);
  assert.equal(distribution.length, 3);
  assert.equal(distribution[0].allocatedCount, 17);
  assert.equal(distribution[1].allocatedCount, 17);
  assert.equal(distribution[2].allocatedCount, 16);
});
