'use client';

import React, { useState, useEffect } from 'react';
import { TopNavigation } from '@/components/TopNavigation';
import { UploadSection } from '@/components/UploadSection';
import { AugmentationConfigSection } from '@/components/AugmentationConfigSection';
import { ResultsSection } from '@/components/ResultsSection';
import { ApiDocsModal } from '@/components/ApiDocsModal';
import {
  ImagePairItem,
  MatchedPair,
  TransformMetadata,
} from '@/lib/augmentation-types';
import {
  classifyAndPairFiles,
  parseYoloText,
  validateMetadata,
} from '@/lib/validation';
import {
  executeTransformation,
  GeneratedResultItem,
  TransformProgress,
} from '@/lib/client-transform-engine';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'config' | 'results'>('upload');
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [pairItems, setPairItems] = useState<ImagePairItem[]>([]);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Metadata pipeline state
  const [metadata, setMetadata] = useState<TransformMetadata>({
    count: 10,
    ext: 'png',
    edits: [
      { action: 'rotate', range: { min: -15, max: 15 } },
      {
        action: 'randomCrop',
        randomCrop: { width: { min: 0.8, max: 1.0 }, height: { min: 0.8, max: 1.0 } },
      },
      { action: 'brightness', range: { min: -15, max: 15 } },
    ],
    flip: {
      enabled: true,
      probability: 0.25,
    },
  });

  // Backend target
  const [targetBackendMode, setTargetBackendMode] = useState<'proxy' | 'direct' | 'client'>('client');
  const [customBackendUrl, setCustomBackendUrl] = useState('http://localhost:3001/images/transform');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<TransformProgress>({
    current: 0,
    total: 0,
    statusText: '',
    percent: 0,
  });
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Results state
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [previewItems, setPreviewItems] = useState<GeneratedResultItem[]>([]);

  // Docs modal
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Process and load files
  const handleFilesLoaded = async (files: File[]) => {
    setProcessingError(null);
    const classification = classifyAndPairFiles(files);

    setPairs(classification.pairs);
    setHasAnnotations(classification.hasAnnotations);
    setUploadErrors(classification.errors);
    setUploadWarnings(classification.warnings);

    // Build rich ImagePairItems
    const items: ImagePairItem[] = [];

    for (const pair of classification.pairs) {
      const url = URL.createObjectURL(pair.imageFile);
      let dimensions: { width: number; height: number } | undefined;

      try {
        dimensions = await getImageDimensions(url);
      } catch (e) {
        console.error('Failed to get dimensions', e);
      }

      let bboxes = undefined;
      let annotationContent = undefined;

      if (pair.annotationFile) {
        try {
          annotationContent = await pair.annotationFile.text();
          const parsed = parseYoloText(annotationContent);
          if (parsed.valid) {
            bboxes = parsed.bboxes;
          } else if (parsed.error) {
            setUploadErrors((prev) => [
              ...prev,
              `Annotation error in ${pair.annotationFile?.name}: ${parsed.error}`,
            ]);
          }
        } catch (e) {
          console.error('Failed to read annotation', e);
        }
      }

      items.push({
        id: pair.stem,
        stem: pair.stem,
        imageFile: pair.imageFile,
        imageUrl: url,
        imageSize: pair.imageFile.size,
        imageDimensions: dimensions,
        annotationFile: pair.annotationFile,
        annotationContent,
        bboxes,
      });
    }

    setPairItems(items);
  };

  const handleClearAll = () => {
    // Revoke object URLs
    pairItems.forEach((p) => URL.revokeObjectURL(p.imageUrl));
    previewItems.forEach((p) => URL.revokeObjectURL(p.imageBlobUrl));

    setPairs([]);
    setPairItems([]);
    setHasAnnotations(false);
    setUploadErrors([]);
    setUploadWarnings([]);
    setZipBlob(null);
    setPreviewItems([]);
    setActiveTab('upload');
  };

  const handleStartProcessing = async () => {
    setProcessingError(null);
    const validation = validateMetadata(metadata, pairs.length);
    if (!validation.valid) {
      setProcessingError(validation.errors.join('; '));
      return;
    }

    setIsProcessing(true);
    setProgress({
      current: 0,
      total: pairs.length * metadata.count,
      statusText: 'Initializing pipeline...',
      percent: 5,
    });

    try {
      const useBackend = targetBackendMode !== 'client';
      const backendUrl =
        targetBackendMode === 'proxy' ? '/api/transform' : customBackendUrl;

      const result = await executeTransformation(pairs, metadata, {
        useBackend,
        backendUrl,
        onProgress: (p) => setProgress(p),
      });

      setZipBlob(result.zipBlob);
      setPreviewItems(result.previewItems);
      setIsProcessing(false);
      setActiveTab('results');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {

      setIsProcessing(false);
      console.error(err);
      setProcessingError(
        err.message || 'Failed to process images. Check backend server status or switch to In-Browser Engine.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <TopNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDocs={() => setIsDocsOpen(true)}
        imageCount={pairs.length}
        resultCount={previewItems.length}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Processing Modal Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">Augmenting Dataset</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                  {progress.statusText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                  <span className="font-semibold text-indigo-400">{progress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-150"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Applying round-robin edits and generating results.zip...
              </p>
            </div>
          </div>
        )}

        {/* Global Error Notice if any */}
        {processingError && (
          <div className="mb-6 rounded-xl border border-rose-900/80 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-rose-300 block mb-0.5">
                  Execution Notice:
                </strong>
                <span>{processingError}</span>
                {targetBackendMode !== 'client' && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetBackendMode('client');
                        setProcessingError(null);
                      }}
                      className="rounded bg-rose-900/60 hover:bg-rose-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                    >
                      Switch to In-Browser Engine & Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProcessingError(null)}
              className="text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active View */}
        {activeTab === 'upload' && (
          <UploadSection
            pairs={pairs}
            pairItems={pairItems}
            hasAnnotations={hasAnnotations}
            errors={uploadErrors}
            warnings={uploadWarnings}
            onFilesLoaded={handleFilesLoaded}
            onClearAll={handleClearAll}
            onProceedToConfig={() => setActiveTab('config')}
            isLoadingSample={isLoadingSample}
            setIsLoadingSample={setIsLoadingSample}
          />
        )}

        {activeTab === 'config' && (
          <AugmentationConfigSection
            imageCount={pairs.length}
            metadata={metadata}
            setMetadata={setMetadata}
            onStartProcessing={handleStartProcessing}
            onBackToUpload={() => setActiveTab('upload')}
            targetBackendMode={targetBackendMode}
            setTargetBackendMode={setTargetBackendMode}
            customBackendUrl={customBackendUrl}
            setCustomBackendUrl={setCustomBackendUrl}
            pairs={pairs}
          />
        )}

        {activeTab === 'results' && (
          <ResultsSection
            zipBlob={zipBlob}
            previewItems={previewItems}
            onTweakConfig={() => setActiveTab('config')}
            onNewBatch={() => {
              setActiveTab('upload');
            }}
          />
        )}
      </main>

      {/* Docs Modal */}
      <ApiDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </div>
  );
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
