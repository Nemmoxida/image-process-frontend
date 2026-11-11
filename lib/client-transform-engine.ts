import JSZip from 'jszip';
import {
  EditAction,
  FlipConfig,
  MatchedPair,
  TransformMetadata,
  YoloBBox,
} from './augmentation-types';
import { parseYoloText } from './validation';

export interface GeneratedResultItem {
  sourceStem: string;
  index: number;
  imageFileName: string;
  imageBlobUrl: string;
  annotationFileName?: string;
  annotationText?: string;
  bboxes?: YoloBBox[];
  appliedEdit: string;
  appliedFlip: boolean;
}

export interface TransformProgress {
  current: number;
  total: number;
  statusText: string;
  percent: number;
}

/**
 * Builds standard multipart FormData matching Go backend spec:
 * - field 'image' for each image file
 * - field 'annotation' for each matching annotation txt file
 * - field 'metadata' as JSON string
 */
export function buildMultipartFormData(
  pairs: MatchedPair[],
  metadata: TransformMetadata
): FormData {
  const formData = new FormData();

  for (const pair of pairs) {
    formData.append('image', pair.imageFile, pair.imageFile.name);
    if (pair.annotationFile) {
      formData.append('annotation', pair.annotationFile, pair.annotationFile.name);
    }
  }

  formData.append('metadata', JSON.stringify(metadata));
  return formData;
}

/**
 * Generates curl command string for developer inspection and copying.
 */
export function generateCurlCommand(
  pairs: MatchedPair[],
  metadata: TransformMetadata,
  endpointUrl: string
): string {
  const lines: string[] = [`curl -X POST "${endpointUrl}"`];

  for (const pair of pairs) {
    lines.push(`  -F "image=@./${pair.imageFile.name}"`);
    if (pair.annotationFile) {
      lines.push(`  -F "annotation=@./${pair.annotationFile.name}"`);
    }
  }

  const jsonStr = JSON.stringify(metadata).replace(/"/g, '\\"');
  lines.push(`  -F "metadata=${jsonStr}"`);
  lines.push('  --output results.zip');

  return lines.join(' \\\n');
}

/**
 * Runs image transformation either against backend or client-side canvas engine,
 * generating/receiving the results.zip archive.
 */
export async function executeTransformation(
  pairs: MatchedPair[],
  metadata: TransformMetadata,
  options: {
    useBackend: boolean;
    backendUrl: string;
    onProgress?: (progress: TransformProgress) => void;
  }
): Promise<{ zipBlob: Blob; previewItems: GeneratedResultItem[] }> {
  if (options.useBackend) {
    return executeBackendTransformation(pairs, metadata, options.backendUrl, options.onProgress);
  } else {
    return executeClientTransformation(pairs, metadata, options.onProgress);
  }
}

async function executeBackendTransformation(
  pairs: MatchedPair[],
  metadata: TransformMetadata,
  backendUrl: string,
  onProgress?: (progress: TransformProgress) => void
): Promise<{ zipBlob: Blob; previewItems: GeneratedResultItem[] }> {
  onProgress?.({
    current: 0,
    total: pairs.length * metadata.count,
    statusText: `Connecting to backend: ${backendUrl}...`,
    percent: 10,
  });

  const formData = buildMultipartFormData(pairs, metadata);

  // We can send directly or via Next.js proxy route
  const response = await fetch(backendUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Backend error (${response.status}): ${errorText}`);
  }

  onProgress?.({
    current: pairs.length * metadata.count,
    total: pairs.length * metadata.count,
    statusText: 'Unpacking results.zip archive from backend...',
    percent: 85,
  });

  const zipBlob = await response.blob();
  const previewItems = await unpackZipResults(zipBlob);

  onProgress?.({
    current: pairs.length * metadata.count,
    total: pairs.length * metadata.count,
    statusText: 'Complete!',
    percent: 100,
  });

  return { zipBlob, previewItems };
}

/**
 * Unpacks results.zip into preview items with object URLs.
 */
export async function unpackZipResults(zipBlob: Blob): Promise<GeneratedResultItem[]> {
  const zip = await JSZip.loadAsync(zipBlob);
  const items: GeneratedResultItem[] = [];

  // Group files by folder/result
  const fileEntries: { [path: string]: JSZip.JSZipObject } = {};
  zip.forEach((relativePath, file) => {
    if (!file.dir) {
      fileEntries[relativePath] = file;
    }
  });

  // Find image files (.png, .jpg, .jpeg)
  const imagePaths = Object.keys(fileEntries).filter((p) => {
    const lower = p.toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
  });

  imagePaths.sort();

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const imgFile = fileEntries[imgPath];
    const imgBlob = await imgFile.async('blob');
    const imageBlobUrl = URL.createObjectURL(imgBlob);

    // Look for matching annotation file (e.g., path with .txt instead of .png)
    const txtPath = imgPath.substring(0, imgPath.lastIndexOf('.')) + '.txt';
    let annotationFileName: string | undefined;
    let annotationText: string | undefined;
    let bboxes: YoloBBox[] | undefined;

    if (fileEntries[txtPath]) {
      annotationFileName = txtPath.split('/').pop();
      annotationText = await fileEntries[txtPath].async('string');
      const parsed = parseYoloText(annotationText);
      if (parsed.valid) {
        bboxes = parsed.bboxes;
      }
    }

    const pathParts = imgPath.split('/');
    const sourceStem = pathParts.length > 1 ? pathParts[0] : 'source';
    const imageFileName = pathParts[pathParts.length - 1];

    items.push({
      sourceStem,
      index: i + 1,
      imageFileName,
      imageBlobUrl,
      annotationFileName,
      annotationText,
      bboxes,
      appliedEdit: 'Backend Result',
      appliedFlip: false,
    });
  }

  return items;
}

/**
 * High-fidelity client-side transformation engine that replicates the Go backend logic
 * with HTML Canvas and JSZip. Handles round-robin edit allocation, random range sampling,
 * vertical flipping, and YOLO bounding box transformations.
 */
export async function executeClientTransformation(
  pairs: MatchedPair[],
  metadata: TransformMetadata,
  onProgress?: (progress: TransformProgress) => void
): Promise<{ zipBlob: Blob; previewItems: GeneratedResultItem[] }> {
  const zip = new JSZip();
  const previewItems: GeneratedResultItem[] = [];

  const totalResults = pairs.length * metadata.count;
  let completed = 0;

  for (const pair of pairs) {
    const sourceStem = pair.stem;
    const folder = zip.folder(sourceStem) || zip;

    // Load source image
    const sourceImg = await fileToImage(pair.imageFile);
    let sourceBBoxes: YoloBBox[] = [];

    if (pair.annotationFile) {
      const text = await pair.annotationFile.text();
      const parsed = parseYoloText(text);
      if (parsed.valid) {
        sourceBBoxes = parsed.bboxes;
      }
    }

    // Apply round-robin edits
    for (let i = 0; i < metadata.count; i++) {
      const editIndex = i % metadata.edits.length;
      const selectedEdit = metadata.edits[editIndex];

      // Check probabilistic flip
      let applyFlip = false;
      if (metadata.flip?.enabled && metadata.flip.probability > 0) {
        applyFlip = Math.random() < metadata.flip.probability;
      }

      // Apply transform to image & bboxes
      const transformResult = await applyTransformToImage(
        sourceImg,
        selectedEdit,
        applyFlip,
        metadata.ext,
        sourceBBoxes
      );

      const resultIndexStr = String(i + 1).padStart(3, '0');
      const ext = getFormatExtension(selectedEdit, metadata.ext);
      const imgFileName = `result_${resultIndexStr}.${ext}`;
      const txtFileName = `result_${resultIndexStr}.txt`;

      // Save to zip
      folder.file(imgFileName, transformResult.blob);

      let resultBBoxes: YoloBBox[] | undefined;
      let annotationText: string | undefined;

      if (pair.annotationFile) {
        resultBBoxes = transformResult.bboxes;
        annotationText = serializeYoloBBoxes(resultBBoxes);
        folder.file(txtFileName, annotationText);
      }

      const imageBlobUrl = URL.createObjectURL(transformResult.blob);

      previewItems.push({
        sourceStem,
        index: i + 1,
        imageFileName: imgFileName,
        imageBlobUrl,
        annotationFileName: pair.annotationFile ? txtFileName : undefined,
        annotationText,
        bboxes: resultBBoxes,
        appliedEdit: describeAppliedEdit(selectedEdit),
        appliedFlip: applyFlip,
      });

      completed++;
      if (onProgress) {
        onProgress({
          current: completed,
          total: totalResults,
          statusText: `Processing ${sourceStem}: ${imgFileName} (${completed}/${totalResults})`,
          percent: Math.round((completed / totalResults) * 90),
        });
      }
    }
  }

  onProgress?.({
    current: totalResults,
    total: totalResults,
    statusText: 'Generating ZIP archive (results.zip)...',
    percent: 95,
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.({
    current: totalResults,
    total: totalResults,
    statusText: 'Complete!',
    percent: 100,
  });

  return { zipBlob, previewItems };
}

function getFormatExtension(edit: EditAction, defaultExt: string): string {
  if (edit.action === 'changeFormat') {
    return edit.format;
  }
  return defaultExt;
}

function sampleRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function describeAppliedEdit(edit: EditAction): string {
  switch (edit.action) {
    case 'rotate':
      return 'Rotate';
    case 'resize':
      return 'Resize';
    case 'randomCrop':
      return 'Random Crop';
    case 'randomScale':
      return 'Random Scale';
    case 'hue':
      return 'Hue Shift';
    case 'exposure':
      return 'Exposure';
    case 'brightness':
      return 'Brightness';
    case 'contrast':
      return 'Contrast';
    case 'saturation':
      return 'Saturation';
    case 'blur':
      return 'Gaussian Blur';
    case 'gaussianNoise':
      return 'Gaussian Noise';
    case 'changeFormat':
      return `Format (${edit.format})`;
  }
}

export function serializeYoloBBoxes(bboxes: YoloBBox[]): string {
  return bboxes
    .map(
      (b) =>
        `${b.classId} ${b.xCenter.toFixed(6)} ${b.yCenter.toFixed(6)} ${b.width.toFixed(6)} ${b.height.toFixed(6)}`
    )
    .join('\n');
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

interface CanvasTransformResult {
  blob: Blob;
  bboxes: YoloBBox[];
  width: number;
  height: number;
}

/**
 * Renders transformation on canvas and adjusts YOLO normalized bounding boxes.
 */
async function applyTransformToImage(
  img: HTMLImageElement,
  edit: EditAction,
  applyFlip: boolean,
  defaultExt: string,
  initialBBoxes: YoloBBox[]
): Promise<CanvasTransformResult> {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  let dstW = srcW;
  let dstH = srcH;
  let boxes = initialBBoxes.map((b) => ({ ...b }));

  // Primary canvas
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas 2d context');

  // Handle Geometric transforms
  if (edit.action === 'resize') {
    let targetW = edit.resize.width;
    let targetH = edit.resize.height;
    if (targetW === 0 && targetH > 0) {
      targetW = Math.round((srcW / srcH) * targetH);
    } else if (targetH === 0 && targetW > 0) {
      targetH = Math.round((srcH / srcW) * targetW);
    }
    dstW = targetW || srcW;
    dstH = targetH || srcH;

    canvas.width = dstW;
    canvas.height = dstH;
    ctx.drawImage(img, 0, 0, dstW, dstH);
    // Bounding boxes in normalized coordinates remain identical on proportional resize!
  } else if (edit.action === 'randomScale') {
    const scale = sampleRange(edit.range.min, edit.range.max);
    dstW = Math.max(1, Math.round(srcW * scale));
    dstH = Math.max(1, Math.round(srcH * scale));

    canvas.width = dstW;
    canvas.height = dstH;
    ctx.drawImage(img, 0, 0, dstW, dstH);
  } else if (edit.action === 'rotate') {
    const deg = sampleRange(edit.range.min, edit.range.max);
    const rad = (deg * Math.PI) / 180;

    // Calculate rotated bounding box size
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    dstW = Math.round(srcW * cos + srcH * sin);
    dstH = Math.round(srcW * sin + srcH * cos);

    canvas.width = dstW;
    canvas.height = dstH;

    ctx.save();
    ctx.translate(dstW / 2, dstH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -srcW / 2, -srcH / 2);
    ctx.restore();

    // Rotate YOLO bounding boxes into axis-aligned boxes
    boxes = boxes.map((box) => {
      const boxPixelW = box.width * srcW;
      const boxPixelH = box.height * srcH;
      const boxPixelXC = box.xCenter * srcW - srcW / 2;
      const boxPixelYC = box.yCenter * srcH - srcH / 2;

      // 4 corners of original box relative to center
      const corners = [
        { x: boxPixelXC - boxPixelW / 2, y: boxPixelYC - boxPixelH / 2 },
        { x: boxPixelXC + boxPixelW / 2, y: boxPixelYC - boxPixelH / 2 },
        { x: boxPixelXC + boxPixelW / 2, y: boxPixelYC + boxPixelH / 2 },
        { x: boxPixelXC - boxPixelW / 2, y: boxPixelYC + boxPixelH / 2 },
      ];

      const rotCorners = corners.map((c) => ({
        x: c.x * Math.cos(rad) - c.y * Math.sin(rad) + dstW / 2,
        y: c.x * Math.sin(rad) + c.y * Math.cos(rad) + dstH / 2,
      }));

      const minX = Math.max(0, Math.min(...rotCorners.map((c) => c.x)));
      const maxX = Math.min(dstW, Math.max(...rotCorners.map((c) => c.x)));
      const minY = Math.max(0, Math.min(...rotCorners.map((c) => c.y)));
      const maxY = Math.min(dstH, Math.max(...rotCorners.map((c) => c.y)));

      const newW = (maxX - minX) / dstW;
      const newH = (maxY - minY) / dstH;
      const newXC = (minX + maxX) / 2 / dstW;
      const newYC = (minY + maxY) / 2 / dstH;

      return {
        classId: box.classId,
        xCenter: clamp(newXC, 0, 1),
        yCenter: clamp(newYC, 0, 1),
        width: clamp(newW, 0, 1),
        height: clamp(newH, 0, 1),
      };
    });
  } else if (edit.action === 'randomCrop') {
    const cropFractionW = sampleRange(edit.randomCrop.width.min, edit.randomCrop.width.max);
    const cropFractionH = sampleRange(edit.randomCrop.height.min, edit.randomCrop.height.max);

    dstW = Math.max(1, Math.round(srcW * cropFractionW));
    dstH = Math.max(1, Math.round(srcH * cropFractionH));

    const maxOffsetX = srcW - dstW;
    const maxOffsetY = srcH - dstH;
    const cropX = maxOffsetX > 0 ? Math.floor(Math.random() * maxOffsetX) : 0;
    const cropY = maxOffsetY > 0 ? Math.floor(Math.random() * maxOffsetY) : 0;

    canvas.width = dstW;
    canvas.height = dstH;
    ctx.drawImage(img, cropX, cropY, dstW, dstH, 0, 0, dstW, dstH);

    // Clip bounding boxes to crop area and remove out-of-bounds boxes
    const newBoxes: YoloBBox[] = [];
    for (const box of boxes) {
      const bMinX = box.xCenter * srcW - (box.width * srcW) / 2;
      const bMaxX = box.xCenter * srcW + (box.width * srcW) / 2;
      const bMinY = box.yCenter * srcH - (box.height * srcH) / 2;
      const bMaxY = box.yCenter * srcH + (box.height * srcH) / 2;

      // Intersect with crop rect
      const clippedMinX = Math.max(cropX, bMinX);
      const clippedMaxX = Math.min(cropX + dstW, bMaxX);
      const clippedMinY = Math.max(cropY, bMinY);
      const clippedMaxY = Math.min(cropY + dstH, bMaxY);

      if (clippedMaxX > clippedMinX && clippedMaxY > clippedMinY) {
        const boxW = clippedMaxX - clippedMinX;
        const boxH = clippedMaxY - clippedMinY;
        const boxXC = clippedMinX + boxW / 2 - cropX;
        const boxYC = clippedMinY + boxH / 2 - cropY;

        newBoxes.push({
          classId: box.classId,
          xCenter: clamp(boxXC / dstW, 0, 1),
          yCenter: clamp(boxYC / dstH, 0, 1),
          width: clamp(boxW / dstW, 0, 1),
          height: clamp(boxH / dstH, 0, 1),
        });
      }
    }
    boxes = newBoxes;
  } else {
    // Non-geometric transforms: hue, exposure, brightness, contrast, saturation, blur, gaussianNoise, changeFormat
    canvas.width = dstW;
    canvas.height = dstH;

    let filterStyle = '';
    if (edit.action === 'hue') {
      const hueDeg = sampleRange(edit.range.min, edit.range.max);
      filterStyle += `hue-rotate(${hueDeg}deg) `;
    } else if (edit.action === 'brightness') {
      const bPct = sampleRange(edit.range.min, edit.range.max);
      filterStyle += `brightness(${Math.max(0, 100 + bPct)}%) `;
    } else if (edit.action === 'contrast') {
      const cPct = sampleRange(edit.range.min, edit.range.max);
      filterStyle += `contrast(${Math.max(0, 100 + cPct)}%) `;
    } else if (edit.action === 'saturation') {
      const sPct = sampleRange(edit.range.min, edit.range.max);
      filterStyle += `saturate(${Math.max(0, 100 + sPct)}%) `;
    } else if (edit.action === 'blur') {
      const sigma = sampleRange(edit.range.min, edit.range.max);
      if (sigma > 0) {
        filterStyle += `blur(${sigma}px) `;
      }
    } else if (edit.action === 'exposure') {
      const stops = sampleRange(edit.range.min, edit.range.max);
      const factor = Math.pow(2, stops);
      filterStyle += `brightness(${factor * 100}%) `;
    }

    if (filterStyle) {
      ctx.filter = filterStyle.trim();
    }
    ctx.drawImage(img, 0, 0, dstW, dstH);
    ctx.filter = 'none';

    // Handle pixel-level gaussian noise if selected
    if (edit.action === 'gaussianNoise') {
      const stdDev = sampleRange(edit.range.min, edit.range.max);
      if (stdDev > 0) {
        const imgData = ctx.getImageData(0, 0, dstW, dstH);
        const data = imgData.data;
        for (let p = 0; p < data.length; p += 4) {
          // Box-Muller gaussian noise
          const u1 = Math.random() || 0.0001;
          const u2 = Math.random();
          const noise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdDev;
          data[p] = clamp(data[p] + noise, 0, 255);
          data[p + 1] = clamp(data[p + 1] + noise, 0, 255);
          data[p + 2] = clamp(data[p + 2] + noise, 0, 255);
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }

  // Handle post-transform probabilistic vertical flip
  if (applyFlip) {
    const flipCanvas = document.createElement('canvas');
    flipCanvas.width = dstW;
    flipCanvas.height = dstH;
    const flipCtx = flipCanvas.getContext('2d');
    if (flipCtx) {
      flipCtx.translate(0, dstH);
      flipCtx.scale(1, -1);
      flipCtx.drawImage(canvas, 0, 0);

      // Replace primary canvas content
      ctx.clearRect(0, 0, dstW, dstH);
      ctx.drawImage(flipCanvas, 0, 0);

      // Invert vertical bbox positions
      boxes = boxes.map((box) => ({
        ...box,
        yCenter: clamp(1 - box.yCenter, 0, 1),
      }));
    }
  }

  // Determine output MIME type
  const outExt = getFormatExtension(edit, defaultExt);
  const mimeType = outExt === 'png' ? 'image/png' : 'image/jpeg';
  const quality = outExt === 'png' ? undefined : 0.92;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas export to blob failed'));
      },
      mimeType,
      quality
    );
  });

  return {
    blob,
    bboxes: boxes,
    width: dstW,
    height: dstH,
  };
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}
