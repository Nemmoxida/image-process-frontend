'use client';

import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  FolderArchive,
  Eye,
  EyeOff,
  RotateCcw,
  FileText,
  Copy,
  Check,
  Filter,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { GeneratedResultItem } from '@/lib/client-transform-engine';

interface ResultsSectionProps {
  zipBlob: Blob | null;
  previewItems: GeneratedResultItem[];
  onTweakConfig: () => void;
  onNewBatch: () => void;
}

export function ResultsSection({
  zipBlob,
  previewItems,
  onTweakConfig,
  onNewBatch,
}: ResultsSectionProps) {
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [activeModalItem, setActiveModalItem] = useState<GeneratedResultItem | null>(null);
  const [copiedTxt, setCopiedTxt] = useState(false);

  // Group items by sourceStem
  const sourceStems = Array.from(new Set(previewItems.map((p) => p.sourceStem)));

  const filteredItems =
    selectedSourceFilter === 'all'
      ? previewItems
      : previewItems.filter((p) => p.sourceStem === selectedSourceFilter);

  const handleDownloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAnnotation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const zipSizeMb = zipBlob ? (zipBlob.size / (1024 * 1024)).toFixed(2) : '0';

  return (
    <div className="space-y-8 pt-1">
      {/* Download Hero Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 sm:p-8 shadow-lg shadow-emerald-950/20">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
              <FolderArchive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Transformation Batch Complete
                </h1>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  results.zip Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Generated {previewItems.length} augmented outputs organized into source folders with synchronized YOLO bounding boxes.
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>Archive size: {zipSizeMb} MB</span>
                <span aria-hidden="true">·</span>
                <span>{sourceStems.length} Source folders</span>
                <span aria-hidden="true">·</span>
                <span>{previewItems.length} Images</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onTweakConfig}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Adjust Parameters
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download results.zip ({zipSizeMb} MB)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Source Folders filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium shrink-0">Folder:</span>
          <button
            type="button"
            onClick={() => setSelectedSourceFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
              selectedSourceFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Sources ({previewItems.length})
          </button>
          {sourceStems.map((stem) => {
            const count = previewItems.filter((p) => p.sourceStem === stem).length;
            return (
              <button
                key={stem}
                type="button"
                onClick={() => setSelectedSourceFilter(stem)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-colors shrink-0 ${
                  selectedSourceFilter === stem
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {stem}/ ({count})
              </button>
            );
          })}
        </div>

        {/* BBox Toggle */}
        <div className="flex items-center gap-3">
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
            <span>YOLO BBoxes: {showBBoxes ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item, idx) => (
          <ResultCard
            key={item.sourceStem + item.imageFileName + idx}
            item={item}
            showBBoxes={showBBoxes}
            onOpenModal={() => setActiveModalItem(item)}
          />
        ))}
      </div>

      {/* Modal / Inspector for single result */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl w-full rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white font-mono">
                  {activeModalItem.sourceStem}/{activeModalItem.imageFileName}
                </h3>
                <p className="text-xs text-slate-400">
                  Applied edit: <span className="text-indigo-400 font-medium">{activeModalItem.appliedEdit}</span>
                  {activeModalItem.appliedFlip && ' + Vertical Flip'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-4/3 w-full bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeModalItem.imageBlobUrl}
                alt={activeModalItem.imageFileName}
                className="max-h-full max-w-full object-contain"
              />

              {showBBoxes && activeModalItem.bboxes && (
                <div className="absolute inset-0 pointer-events-none">
                  {activeModalItem.bboxes.map((box, bIdx) => (
                    <div
                      key={bIdx}
                      className="absolute border border-emerald-400 bg-emerald-400/10 text-[10px] font-mono text-emerald-300"
                      style={{
                        left: `${(box.xCenter - box.width / 2) * 100}%`,
                        top: `${(box.yCenter - box.height / 2) * 100}%`,
                        width: `${box.width * 100}%`,
                        height: `${box.height * 100}%`,
                      }}
                    >
                      <span className="bg-emerald-950/90 px-1 py-0.5 rounded-br">c{box.classId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeModalItem.annotationText && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">
                    YOLO Coordinates ({activeModalItem.annotationFileName})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAnnotation(activeModalItem.annotationText || '')}
                    className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedTxt ? 'Copied!' : 'Copy YOLO Coords'}</span>
                  </button>
                </div>
                <pre className="rounded bg-slate-900 p-2.5 font-mono text-xs text-emerald-300 max-h-24 overflow-y-auto">
                  {activeModalItem.annotationText}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  item,
  showBBoxes,
  onOpenModal,
}: {
  item: GeneratedResultItem;
  showBBoxes: boolean;
  onOpenModal: () => void;
}) {
  return (
    <div
      onClick={onOpenModal}
      className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-indigo-500/50 hover:bg-slate-900/70 transition-all cursor-pointer"
    >
      <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageBlobUrl}
          alt={item.imageFileName}
          className="max-h-full max-w-full object-contain"
        />

        {showBBoxes && item.bboxes && item.bboxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {item.bboxes.map((box, bIdx) => (
              <div
                key={bIdx}
                className="absolute border border-emerald-400 bg-emerald-400/10 text-[8px] font-mono text-emerald-300"
                style={{
                  left: `${(box.xCenter - box.width / 2) * 100}%`,
                  top: `${(box.yCenter - box.height / 2) * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
              >
                <span className="bg-emerald-950/80 px-0.5 leading-tight">c{box.classId}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stem / Folder tag */}
        <div className="absolute top-2 left-2 rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-slate-800">
          {item.sourceStem}
        </div>

        {item.appliedFlip && (
          <div className="absolute top-2 right-2 rounded bg-indigo-950/90 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-800">
            Flipped
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-white truncate font-medium">{item.imageFileName}</span>
          <span className="text-indigo-400 text-[11px] shrink-0 font-sans">
            {item.appliedEdit}
          </span>
        </div>

        {item.annotationFileName && (
          <div className="text-[11px] text-emerald-400 font-mono truncate">
            {item.annotationFileName} ({item.bboxes?.length || 0} box
            {item.bboxes?.length === 1 ? '' : 'es'})
          </div>
        )}
      </div>
    </div>
  );
}
