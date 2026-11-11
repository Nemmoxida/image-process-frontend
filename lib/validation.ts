import {
  EditAction,
  MatchedPair,
  TransformMetadata,
  ValidationResult,
  YoloBBox,
} from './augmentation-types';


export const MAX_IMAGES = 50;
export const MAX_COUNT_PER_IMAGE = 50;
export const MAX_TOTAL_GENERATED = 2500;
export const MAX_FILE_SIZE_BYTES = 400 * 1024; // 400 KiB per backend spec
export const MAX_IMAGE_DIMENSION_PX = 500; // 500 px width/height source limit per backend spec

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function extractStem(filename: string): string {
  // Strip path if present
  const base = filename.replace(/^.*[\\/]/, '');
  const lastDot = base.lastIndexOf('.');
  if (lastDot === -1) return base;
  return base.substring(0, lastDot);
}

export function parseYoloText(content: string): {
  valid: boolean;
  bboxes: YoloBBox[];
  error?: string;
} {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const bboxes: YoloBBox[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/\s+/);
    if (parts.length < 5) {
      return {
        valid: false,
        bboxes: [],
        error: `Line ${i + 1} has ${parts.length} tokens; expected 5 (class_id x_center y_center width height)`,
      };
    }

    const classId = Number.parseInt(parts[0], 10);
    const xCenter = Number.parseFloat(parts[1]);
    const yCenter = Number.parseFloat(parts[2]);
    const width = Number.parseFloat(parts[3]);
    const height = Number.parseFloat(parts[4]);

    if (Number.isNaN(classId) || classId < 0) {
      return {
        valid: false,
        bboxes: [],
        error: `Line ${i + 1}: class_id must be a non-negative integer, got "${parts[0]}"`,
      };
    }

    if (
      Number.isNaN(xCenter) ||
      Number.isNaN(yCenter) ||
      Number.isNaN(width) ||
      Number.isNaN(height)
    ) {
      return {
        valid: false,
        bboxes: [],
        error: `Line ${i + 1}: coordinates and dimensions must be valid numbers`,
      };
    }

    if (
      xCenter < 0 || xCenter > 1 ||
      yCenter < 0 || yCenter > 1 ||
      width < 0 || width > 1 ||
      height < 0 || height > 1
    ) {
      return {
        valid: false,
        bboxes: [],
        error: `Line ${i + 1}: YOLO normalized coordinates must be between 0.0 and 1.0`,
      };
    }

    bboxes.push({ classId, xCenter, yCenter, width, height });
  }

  return { valid: true, bboxes };
}

export interface FileClassificationResult {

  pairs: MatchedPair[];
  unmatchedImages: File[];
  unmatchedAnnotations: File[];
  errors: string[];
  warnings: string[];
  hasAnnotations: boolean;
}

/**
 * Given a list of files (from file input or dropped folder), organizes images and annotations.
 * Complies with backend requirements:
 * 1. Image format must be .png, .jpg, or .jpeg.
 * 2. Annotation format must be .txt.
 * 3. Max 50 images in one go.
 * 4. If any annotation is provided, every image must have an annotation with identical stem.
 */
export function classifyAndPairFiles(files: File[]): FileClassificationResult {
  const images: File[] = [];
  const annotations: File[] = [];
  const ignoredFiles: string[] = [];

  for (const file of files) {
    // Ignore hidden files and system artifacts like .DS_Store
    if (file.name.startsWith('.')) continue;

    const ext = getFileExtension(file.name);
    if (IMAGE_EXTENSIONS.has(ext)) {
      images.push(file);
    } else if (ext === 'txt') {
      annotations.push(file);
    } else {
      ignoredFiles.push(file.name);
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (images.length === 0) {
    errors.push('No supported image files (.png, .jpg, .jpeg) found.');
  }

  if (images.length > MAX_IMAGES) {
    errors.push(
      `Exceeded maximum allowed images: ${images.length} uploaded, but maximum allowed is ${MAX_IMAGES}.`
    );
  }

  // Check file sizes
  for (const img of images) {
    if (img.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(
        `Image "${img.name}" (${(img.size / 1024).toFixed(1)} KiB) exceeds the 400 KiB backend limit.`
      );
    }
  }

  for (const ann of annotations) {
    if (ann.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(
        `Annotation "${ann.name}" (${(ann.size / 1024).toFixed(1)} KiB) exceeds the 400 KiB limit.`
      );
    }
  }

  const hasAnnotations = annotations.length > 0;
  const imageMap = new Map<string, File>();
  const duplicateImageStems: string[] = [];

  for (const img of images) {
    const stem = extractStem(img.name);
    if (imageMap.has(stem)) {
      duplicateImageStems.push(stem);
    } else {
      imageMap.set(stem, img);
    }
  }

  if (duplicateImageStems.length > 0) {
    errors.push(
      `Duplicate image stem names detected: ${duplicateImageStems.join(', ')}. Each image must have a unique stem name.`
    );
  }

  const annotationMap = new Map<string, File>();
  const duplicateAnnotationStems: string[] = [];

  for (const ann of annotations) {
    const stem = extractStem(ann.name);
    if (annotationMap.has(stem)) {
      duplicateAnnotationStems.push(stem);
    } else {
      annotationMap.set(stem, ann);
    }
  }

  if (duplicateAnnotationStems.length > 0) {
    errors.push(
      `Duplicate annotation stem names detected: ${duplicateAnnotationStems.join(', ')}.`
    );
  }

  const pairs: MatchedPair[] = [];
  const unmatchedImages: File[] = [];
  const unmatchedAnnotations: File[] = [];

  // Pair images with annotations
  for (const [stem, img] of imageMap.entries()) {
    const ann = annotationMap.get(stem);
    if (hasAnnotations) {
      if (ann) {
        pairs.push({ stem, imageFile: img, annotationFile: ann });
        annotationMap.delete(stem);
      } else {
        unmatchedImages.push(img);
      }
    } else {
      pairs.push({ stem, imageFile: img });
    }
  }

  // Any remaining annotations are unmatched
  for (const ann of annotationMap.values()) {
    unmatchedAnnotations.push(ann);
  }

  if (hasAnnotations) {
    if (unmatchedImages.length > 0) {
      errors.push(
        `Annotation mismatch: ${unmatchedImages.length} image(s) have no corresponding .txt annotation (${unmatchedImages.map((f) => f.name).slice(0, 5).join(', ')}${unmatchedImages.length > 5 ? '...' : ''}). If annotations are included, every image must have a matching .txt file.`
      );
    }
    if (unmatchedAnnotations.length > 0) {
      errors.push(
        `Annotation mismatch: ${unmatchedAnnotations.length} annotation(s) have no corresponding image (${unmatchedAnnotations.map((f) => f.name).slice(0, 5).join(', ')}${unmatchedAnnotations.length > 5 ? '...' : ''}).`
      );
    }
  }

  if (ignoredFiles.length > 0 && ignoredFiles.length <= 5) {
    warnings.push(`Ignored unsupported file(s): ${ignoredFiles.join(', ')}`);
  } else if (ignoredFiles.length > 5) {
    warnings.push(`Ignored ${ignoredFiles.length} unsupported files.`);
  }

  return {
    pairs,
    unmatchedImages,
    unmatchedAnnotations,
    errors,
    warnings,
    hasAnnotations,
  };
}

/**
 * Validates metadata configuration against API specifications.
 */
export function validateMetadata(
  metadata: TransformMetadata,
  imageCount: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (imageCount <= 0) {
    errors.push('At least one source image must be uploaded.');
  }

  if (imageCount > MAX_IMAGES) {
    errors.push(`Maximum source images is ${MAX_IMAGES}, got ${imageCount}.`);
  }

  if (!Number.isInteger(metadata.count) || metadata.count < 1 || metadata.count > MAX_COUNT_PER_IMAGE) {
    errors.push(`"count" must be an integer between 1 and ${MAX_COUNT_PER_IMAGE}, got ${metadata.count}.`);
  }

  if (!['png', 'jpg', 'jpeg'].includes(metadata.ext)) {
    errors.push(`"ext" must be one of: png, jpg, jpeg.`);
  }

  if (!Array.isArray(metadata.edits) || metadata.edits.length === 0) {
    errors.push('At least one augmentation edit must be selected.');
  } else {
    if (metadata.count < metadata.edits.length) {
      errors.push(
        `"count" (${metadata.count}) must be at least the number of selected edits (${metadata.edits.length}).`
      );
    }

    metadata.edits.forEach((edit, index) => {
      validateEdit(edit, index, errors);
    });
  }

  if (metadata.flip?.enabled) {
    const p = metadata.flip.probability;
    if (typeof p !== 'number' || Number.isNaN(p) || p < 0 || p > 1) {
      errors.push(`Flip probability must be a number between 0.0 and 1.0, got ${p}.`);
    }
  }

  const totalGenerated = imageCount * metadata.count;
  if (totalGenerated > MAX_TOTAL_GENERATED) {
    errors.push(
      `Total generated images (${totalGenerated}) exceeds maximum limit of ${MAX_TOTAL_GENERATED}. Reduce image count or count per image.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateEdit(edit: EditAction, index: number, errors: string[]) {
  const idx = `Edit #${index + 1} (${edit.action})`;

  switch (edit.action) {
    case 'rotate':
      if (edit.range.min < -360 || edit.range.max > 360) {
        errors.push(`${idx}: rotate range must be between -360 and 360 degrees.`);
      }
      if (edit.range.min > edit.range.max) {
        errors.push(`${idx}: min (${edit.range.min}) cannot exceed max (${edit.range.max}).`);
      }
      break;

    case 'resize':
      if (edit.resize.width < 0 || edit.resize.height < 0) {
        errors.push(`${idx}: width and height must be non-negative.`);
      }
      if (edit.resize.width === 0 && edit.resize.height === 0) {
        errors.push(`${idx}: at least one dimension must be greater than 0.`);
      }
      if (edit.resize.width > 2000 || edit.resize.height > 2000) {
        errors.push(`${idx}: output dimensions cannot exceed 2000px.`);
      }
      break;

    case 'randomCrop':
      if (
        edit.randomCrop.width.min < 0.01 || edit.randomCrop.width.max > 1.0 ||
        edit.randomCrop.height.min < 0.01 || edit.randomCrop.height.max > 1.0
      ) {
        errors.push(`${idx}: width and height fractions must be between 0.01 and 1.0.`);
      }
      if (edit.randomCrop.width.min > edit.randomCrop.width.max) {
        errors.push(`${idx}: width min cannot exceed max.`);
      }
      if (edit.randomCrop.height.min > edit.randomCrop.height.max) {
        errors.push(`${idx}: height min cannot exceed max.`);
      }
      break;

    case 'randomScale':
      if (edit.range.min < 0.1 || edit.range.max > 4.0) {
        errors.push(`${idx}: scale factor must be between 0.1 and 4.0.`);
      }
      if (edit.range.min > edit.range.max) {
        errors.push(`${idx}: min cannot exceed max.`);
      }
      break;

    case 'hue':
      if (edit.range.min < -360 || edit.range.max > 360) {
        errors.push(`${idx}: hue range must be between -360 and 360.`);
      }
      break;

    case 'exposure':
      if (edit.range.min < -10 || edit.range.max > 10) {
        errors.push(`${idx}: exposure stops must be between -10 and 10.`);
      }
      break;

    case 'brightness':
    case 'contrast':
    case 'saturation':
      if (edit.range.min < -100 || edit.range.max > 100) {
        errors.push(`${idx}: percentage adjustment must be between -100 and 100.`);
      }
      break;

    case 'blur':
      if (edit.range.min < 0 || edit.range.max > 100) {
        errors.push(`${idx}: blur sigma must be between 0 and 100.`);
      }
      break;

    case 'gaussianNoise':
      if (edit.range.min < 0 || edit.range.max > 255) {
        errors.push(`${idx}: noise standard deviation must be between 0 and 255.`);
      }
      break;

    case 'changeFormat':
      if (!['png', 'jpg', 'jpeg'].includes(edit.format)) {
        errors.push(`${idx}: format must be png, jpg, or jpeg.`);
      }
      break;
  }
}

/**
 * Calculates the exact round-robin distribution of edits given a count.
 * E.g., count = 10 and 3 edits => edit 0 gets 4, edit 1 gets 3, edit 2 gets 3.
 */
export function calculateRoundRobinDistribution(
  count: number,
  edits: EditAction[]
): { edit: EditAction; allocatedCount: number; label: string }[] {
  if (edits.length === 0) return [];
  const counts = new Array(edits.length).fill(0);

  for (let i = 0; i < count; i++) {
    counts[i % edits.length]++;
  }

  return edits.map((edit, idx) => ({
    edit,
    allocatedCount: counts[idx],
    label: formatEditLabel(edit),
  }));
}

export function formatEditLabel(edit: EditAction): string {
  switch (edit.action) {
    case 'rotate':
      return `Rotate [${edit.range.min}° .. ${edit.range.max}°]`;
    case 'resize':
      return `Resize ${edit.resize.width || 'auto'}×${edit.resize.height || 'auto'}`;
    case 'randomCrop':
      return `Random Crop [W: ${(edit.randomCrop.width.min * 100).toFixed(0)}%-${(edit.randomCrop.width.max * 100).toFixed(0)}%, H: ${(edit.randomCrop.height.min * 100).toFixed(0)}%-${(edit.randomCrop.height.max * 100).toFixed(0)}%]`;
    case 'randomScale':
      return `Random Scale [${edit.range.min}x .. ${edit.range.max}x]`;
    case 'hue':
      return `Hue Shift [${edit.range.min}° .. ${edit.range.max}°]`;
    case 'exposure':
      return `Exposure [${edit.range.min} .. ${edit.range.max} stops]`;
    case 'brightness':
      return `Brightness [${edit.range.min}% .. ${edit.range.max}%]`;
    case 'contrast':
      return `Contrast [${edit.range.min}% .. ${edit.range.max}%]`;
    case 'saturation':
      return `Saturation [${edit.range.min}% .. ${edit.range.max}%]`;
    case 'blur':
      return `Blur [σ: ${edit.range.min} .. ${edit.range.max}]`;
    case 'gaussianNoise':
      return `Gaussian Noise [σ: ${edit.range.min} .. ${edit.range.max}]`;
    case 'changeFormat':
      return `Format (${edit.format.toUpperCase()})`;
    default:
      return (edit as EditAction).action;
  }
}
