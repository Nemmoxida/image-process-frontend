'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FolderUp,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  MatchedPair,
  ImagePairItem,
  YoloBBox,
} from '@/lib/augmentation-types';
import {
  classifyAndPairFiles,
  MAX_IMAGES,
  MAX_FILE_SIZE_BYTES,
  parseYoloText,
} from '@/lib/validation';
import { createSampleFiles } from '@/lib/sample-data';

interface UploadSectionProps {
  pairs: MatchedPair[];
  pairItems: ImagePairItem[];
  hasAnnotations: boolean;
  errors: string[];
  warnings: string[];
  onFilesLoaded: (files: File[]) => void;
  onClearAll: () => void;
  onProceedToConfig: () => void;
  isLoadingSample: boolean;
  setIsLoadingSample: (loading: boolean) => void;
}

export function UploadSection({
  pairs,
  pairItems,
  hasAnnotations,
  errors,
  warnings,
  onFilesLoaded,
  onClearAll,
  onProceedToConfig,
  isLoadingSample,
  setIsLoadingSample,
}: UploadSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [folderCheckError, setFolderCheckError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setFolderCheckError(null);

    const items = e.dataTransfer.items;
    const droppedFiles: File[] = [];

    if (items) {
      const entryPromises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry?.();
          if (entry) {
            entryPromises.push(traverseEntry(entry, droppedFiles));
          } else {
            const f = item.getAsFile();
            if (f) droppedFiles.push(f);
          }
        }
      }
      await Promise.all(entryPromises);
    } else if (e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        droppedFiles.push(e.dataTransfer.files[i]);
      }
    }

    if (droppedFiles.length > 0) {
      onFilesLoaded(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderCheckError(null);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesLoaded(files);
      e.target.value = '';
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderCheckError(null);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // Check folder rule: folder must contain subfolders named "image" and "annotation"
      let hasImageFolder = false;
      let hasAnnotationFolder = false;

      for (const file of files) {
        const path = (file as any).webkitRelativePath || file.name;
        const segments = path.toLowerCase().split(/[\\/]/);
        if (segments.some((s: string) => s === 'image' || s === 'images')) {
          hasImageFolder = true;
        }
        if (segments.some((s: string) => s === 'annotation' || s === 'annotations' || s === 'labels')) {
          hasAnnotationFolder = true;
        }
      }

      if (!hasImageFolder || !hasAnnotationFolder) {
        setFolderCheckError(
          'Folder validation failed: The selected dataset folder must contain two subfolders named "image" (for images) and "annotation" (for YOLO txt files).'
        );
      }

      onFilesLoaded(files);
      e.target.value = '';
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      setFolderCheckError(null);
      const sampleFiles = await createSampleFiles();
      onFilesLoaded(sampleFiles);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const isValidForNext = pairs.length > 0 && errors.length === 0 && !folderCheckError;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            1. Source Images & YOLO Annotations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload up to 50 source images (<span className="text-slate-300">.png, .jpg, .jpeg</span>) and optional matching YOLO annotations (<span className="text-slate-300">.txt</span>).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3.5 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>{isLoadingSample ? 'Loading Demo...' : 'Load Sample Dataset'}</span>
          </button>

          {pairs.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone / Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-950/20'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
        }`}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UploadCloud className="h-7 w-7" />
          </div>

          <h3 className="text-base font-semibold text-white">
            Drag & drop images, annotations, or dataset folder
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Supports multiple individual files or a root directory containing <span className="font-mono text-slate-300">image/</span> and <span className="font-mono text-slate-300">annotation/</span>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
              onChange={handleFolderInputChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Select Files</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <FolderUp className="h-4 w-4 text-slate-400" />
              <span>Select Dataset Folder</span>
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4 text-xs text-slate-500">
            <span>Max 50 images</span>
            <span aria-hidden="true">·</span>
            <span>≤ 400 KiB per file</span>
            <span aria-hidden="true">·</span>
            <span>1:1 stem pairing (e.g. image_1.png ↔ image_1.txt)</span>
          </div>
        </div>
      </div>

      {/* Validation Errors & Alerts */}
      {(folderCheckError || errors.length > 0) && (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-xs text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>Dataset Validation Errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-rose-300/90">
            {folderCheckError && <li>{folderCheckError}</li>}
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-medium text-amber-300">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Dataset Notices:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-300/80">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Bar */}
      {pairs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {pairs.length} {pairs.length === 1 ? 'Image' : 'Images'} Loaded
                </span>
                <span className="text-xs text-slate-500">/ max {MAX_IMAGES}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasAnnotations
                  ? `All ${pairs.length} images paired with matching YOLO annotations.`
                  : 'Images loaded without annotations (pure image augmentation mode).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {hasAnnotations && (
              <button
                type="button"
                onClick={() => setShowBBoxes(!showBBoxes)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showBBoxes
                    ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {showBBoxes ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>BBoxes: {showBBoxes ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isValidForNext}
              onClick={onProceedToConfig}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Configure Augmentations →
            </button>
          </div>
        </div>
      )}

      {/* Loaded Pairs Grid */}
      {pairItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Uploaded Data Pairs ({pairItems.length})</span>
            <span>Previewing source resolution & YOLO labels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairItems.map((item) => (
              <PairCard
                key={item.stem}
                item={item}
                showBBoxes={showBBoxes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PairCard({
  item,
  showBBoxes,
}: {
  item: ImagePairItem;
  showBBoxes: boolean;
}) {
  const isOversized = item.imageSize > MAX_FILE_SIZE_BYTES;
  const isOverDimension =
    item.imageDimensions &&
    (item.imageDimensions.width > 500 || item.imageDimensions.height > 500);

  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Image Preview with Bounding Box Overlay */}
      <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.stem}
          className="max-h-full max-w-full object-contain"
        />

        {/* YOLO Bounding Boxes Overlay */}
        {showBBoxes && item.bboxes && item.bboxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {item.bboxes.map((box, bIdx) => {
              const left = `${(box.xCenter - box.width / 2) * 100}%`;
              const top = `${(box.yCenter - box.height / 2) * 100}%`;
              const width = `${box.width * 100}%`;
              const height = `${box.height * 100}%`;

              return (
                <div
                  key={bIdx}
                  className="absolute border border-emerald-400 bg-emerald-400/10 text-[9px] font-mono text-emerald-300 font-semibold leading-none"
                  style={{ left, top, width, height }}
                >
                  <span className="bg-emerald-950/80 px-1 py-0.5 rounded-br border-b border-r border-emerald-500/40">
                    c{box.classId}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stem badge */}
        <div className="absolute top-2 left-2 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-800">
          {item.stem}
        </div>

        {item.imageDimensions && (
          <div className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-800">
            {item.imageDimensions.width}×{item.imageDimensions.height}px
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
            <ImageIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.imageFile.name}</span>
          </div>
          <span className="font-mono text-slate-400 shrink-0 tabular-nums">
            {(item.imageSize / 1024).toFixed(1)} KiB
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
          {item.annotationFile ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.annotationFile.name}</span>
              <span className="text-slate-500 font-mono">
                ({item.bboxes?.length || 0} box{item.bboxes?.length === 1 ? '' : 'es'})
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">No annotation</span>
          )}

          {isOversized && (
            <span className="text-amber-400 text-[10px]" title="Exceeds 400 KiB backend limit">
              &gt;400 KiB
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

async function traverseEntry(entry: any, outFiles: File[], pathPrefix = ''): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => {
        // Tag relative path onto file object
        const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          writable: true,
        });
        outFiles.push(file);
        resolve();
      });
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readEntries = (): Promise<any[]> =>
      new Promise((resolve) => {
        dirReader.readEntries((entries: any[]) => resolve(entries));
      });

    let entries: any[] = [];
    let batch: any[] = [];
    do {
      batch = await readEntries();
      entries = entries.concat(batch);
    } while (batch.length > 0);

    const nextPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    const subPromises = entries.map((e) => traverseEntry(e, outFiles, nextPrefix));
    await Promise.all(subPromises);
  }
}
