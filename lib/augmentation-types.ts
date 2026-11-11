export type OutputFormat = 'png' | 'jpg' | 'jpeg';

export type EditActionType =
  | 'rotate'
  | 'resize'
  | 'randomCrop'
  | 'randomScale'
  | 'hue'
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'blur'
  | 'gaussianNoise'
  | 'changeFormat';

export interface MinMaxRange {
  min: number;
  max: number;
}

export interface RotateEdit {
  action: 'rotate';
  range: MinMaxRange; // degrees -360 to 360
}

export interface ResizeEdit {
  action: 'resize';
  resize: {
    width: number;
    height: number; // 0 to preserve aspect ratio
  };
}

export interface RandomCropEdit {
  action: 'randomCrop';
  randomCrop: {
    width: MinMaxRange; // 0.01 to 1.0 fraction
    height: MinMaxRange; // 0.01 to 1.0 fraction
  };
}

export interface RandomScaleEdit {
  action: 'randomScale';
  range: MinMaxRange; // 0.1 to 4.0 scale factor
}

export interface HueEdit {
  action: 'hue';
  range: MinMaxRange; // -360 to 360
}

export interface ExposureEdit {
  action: 'exposure';
  range: MinMaxRange; // -10 to 10 stops
}

export interface BrightnessEdit {
  action: 'brightness';
  range: MinMaxRange; // -100 to 100 percent
}

export interface ContrastEdit {
  action: 'contrast';
  range: MinMaxRange; // -100 to 100 percent
}

export interface SaturationEdit {
  action: 'saturation';
  range: MinMaxRange; // -100 to 100 percent
}

export interface BlurEdit {
  action: 'blur';
  range: MinMaxRange; // 0 to 100 sigma
}

export interface GaussianNoiseEdit {
  action: 'gaussianNoise';
  range: MinMaxRange; // 0 to 255 std dev
}

export interface ChangeFormatEdit {
  action: 'changeFormat';
  format: OutputFormat;
}

export type EditAction =
  | RotateEdit
  | ResizeEdit
  | RandomCropEdit
  | RandomScaleEdit
  | HueEdit
  | ExposureEdit
  | BrightnessEdit
  | ContrastEdit
  | SaturationEdit
  | BlurEdit
  | GaussianNoiseEdit
  | ChangeFormatEdit;

export interface FlipConfig {
  enabled: boolean;
  probability: number; // 0.0 to 1.0
}

export interface TransformMetadata {
  count: number; // 1 to 50
  ext: OutputFormat;
  edits: EditAction[];
  flip?: FlipConfig;
}

export interface YoloBBox {
  classId: number;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface MatchedPair {
  stem: string;
  imageFile: File;
  annotationFile?: File;
}

export interface ImagePairItem {
  id: string;

  stem: string;
  imageFile: File;
  imageUrl: string;
  imageSize: number; // in bytes
  imageDimensions?: { width: number; height: number };
  annotationFile?: File;
  annotationContent?: string;
  bboxes?: YoloBBox[];
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
