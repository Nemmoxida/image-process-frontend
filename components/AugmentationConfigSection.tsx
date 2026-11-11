'use client';

import React, { useState } from 'react';
import {
  RotateCw,
  Scaling,
  Crop,
  Maximize2,
  Palette,
  Sun,
  Contrast,
  Sliders,
  Sparkles,
  Droplets,
  Zap,
  FileType,
  FlipVertical,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Info,
  Server,
  Cpu,
} from 'lucide-react';
import {
  EditAction,
  EditActionType,
  FlipConfig,
  OutputFormat,
  TransformMetadata,
} from '@/lib/augmentation-types';
import {
  calculateRoundRobinDistribution,
  MAX_COUNT_PER_IMAGE,
  MAX_TOTAL_GENERATED,
} from '@/lib/validation';
import { generateCurlCommand } from '@/lib/client-transform-engine';

interface AugmentationConfigSectionProps {
  imageCount: number;
  metadata: TransformMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<TransformMetadata>>;
  onStartProcessing: () => void;
  onBackToUpload: () => void;
  targetBackendMode: 'proxy' | 'direct' | 'client';
  setTargetBackendMode: (mode: 'proxy' | 'direct' | 'client') => void;
  customBackendUrl: string;
  setCustomBackendUrl: (url: string) => void;
  pairs: any[];
}

export function AugmentationConfigSection({
  imageCount,
  metadata,
  setMetadata,
  onStartProcessing,
  onBackToUpload,
  targetBackendMode,
  setTargetBackendMode,
  customBackendUrl,
  setCustomBackendUrl,
  pairs,
}: AugmentationConfigSectionProps) {
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Helper to test if an action is enabled in metadata.edits
  const isActionEnabled = (type: EditActionType): boolean => {
    return metadata.edits.some((e) => e.action === type);
  };

  const getAction = (type: EditActionType): EditAction | undefined => {
    return metadata.edits.find((e) => e.action === type);
  };

  const toggleAction = (type: EditActionType, defaultEdit: EditAction) => {
    setMetadata((prev) => {
      const exists = prev.edits.some((e) => e.action === type);
      let newEdits: EditAction[];
      if (exists) {
        newEdits = prev.edits.filter((e) => e.action !== type);
      } else {
        newEdits = [...prev.edits, defaultEdit];
      }

      // Ensure count >= newEdits.length
      const newCount = Math.max(prev.count, Math.max(1, newEdits.length));

      return {
        ...prev,
        count: newCount,
        edits: newEdits,
      };
    });
  };

  const updateEdit = (updatedEdit: EditAction) => {
    setMetadata((prev) => ({
      ...prev,
      edits: prev.edits.map((e) => (e.action === updatedEdit.action ? updatedEdit : e)),
    }));
  };

  // Preset Configurations
  const applyPreset = (presetName: string) => {
    if (presetName === 'general') {
      setMetadata({
        count: 20,
        ext: 'png',
        flip: { enabled: true, probability: 0.25 },
        edits: [
          { action: 'rotate', range: { min: -15, max: 15 } },
          {
            action: 'randomCrop',
            randomCrop: { width: { min: 0.8, max: 1.0 }, height: { min: 0.8, max: 1.0 } },
          },
          { action: 'brightness', range: { min: -20, max: 20 } },
          { action: 'randomScale', range: { min: 0.85, max: 1.15 } },
        ],
      });
    } else if (presetName === 'cv-robustness') {
      setMetadata({
        count: 30,
        ext: 'png',
        flip: { enabled: true, probability: 0.5 },
        edits: [
          { action: 'rotate', range: { min: -30, max: 30 } },
          { action: 'blur', range: { min: 0.5, max: 2.5 } },
          { action: 'gaussianNoise', range: { min: 10, max: 35 } },
          { action: 'contrast', range: { min: -25, max: 25 } },
          { action: 'hue', range: { min: -25, max: 25 } },
        ],
      });
    } else if (presetName === 'photometric') {
      setMetadata({
        count: 15,
        ext: 'png',
        flip: { enabled: false, probability: 0 },
        edits: [
          { action: 'brightness', range: { min: -25, max: 25 } },
          { action: 'contrast', range: { min: -30, max: 30 } },
          { action: 'saturation', range: { min: -35, max: 35 } },
          { action: 'exposure', range: { min: -1.5, max: 1.5 } },
        ],
      });
    } else if (presetName === 'minimal') {
      setMetadata({
        count: 10,
        ext: 'png',
        flip: { enabled: false, probability: 0 },
        edits: [{ action: 'rotate', range: { min: -10, max: 10 } }],
      });
    }
  };

  const totalGenerated = imageCount * metadata.count;
  const isOverGenerated = totalGenerated > MAX_TOTAL_GENERATED;
  const isCountTooLow = metadata.count < metadata.edits.length;
  const hasNoEdits = metadata.edits.length === 0;

  const distribution = calculateRoundRobinDistribution(metadata.count, metadata.edits);

  const endpointForCurl =
    targetBackendMode === 'direct'
      ? customBackendUrl
      : targetBackendMode === 'proxy'
      ? '/api/transform'
      : 'in-browser-engine';

  const curlString = generateCurlCommand(pairs, metadata, endpointForCurl);

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlString);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            2. Configure Augmentation Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Define edit actions, parameter ranges, and round-robin output quotas. Each generated image receives one edit plus optional vertical flip.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('general')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            General
          </button>
          <button
            type="button"
            onClick={() => applyPreset('cv-robustness')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            CV Robustness
          </button>
          <button
            type="button"
            onClick={() => applyPreset('photometric')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            Photometric
          </button>
          <button
            type="button"
            onClick={() => applyPreset('minimal')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            Minimal
          </button>
        </div>
      </div>

      {/* Global Output Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        {/* Count per image */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">
              Augmentations Per Image (<span className="font-mono text-indigo-400">count</span>)
            </label>
            <span className="font-mono text-xs font-bold text-indigo-400 tabular-nums">
              {metadata.count} results
            </span>
          </div>
          <input
            type="range"
            min={Math.max(1, metadata.edits.length)}
            max={MAX_COUNT_PER_IMAGE}
            value={metadata.count}
            onChange={(e) =>
              setMetadata((prev) => ({
                ...prev,
                count: Number.parseInt(e.target.value, 10),
              }))
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Min: {Math.max(1, metadata.edits.length)}</span>
            <span>Max: {MAX_COUNT_PER_IMAGE} per image</span>
          </div>
        </div>

        {/* Base Format (ext) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">
            Output File Extension (<span className="font-mono text-indigo-400">ext</span>)
          </label>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {(['png', 'jpg', 'jpeg'] as OutputFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setMetadata((prev) => ({ ...prev, ext: fmt }))}
                className={`flex-1 rounded py-1.5 text-xs font-semibold uppercase transition-colors ${
                  metadata.ext === fmt
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Default extension for transformed images in ZIP archive.
          </p>
        </div>

        {/* Probabilistic Vertical Flip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={metadata.flip?.enabled || false}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    flip: {
                      enabled: e.target.checked,
                      probability: prev.flip?.probability ?? 0.25,
                    },
                  }))
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Probabilistic Flip</span>
            </label>
            {metadata.flip?.enabled && (
              <span className="font-mono text-xs font-bold text-indigo-400 tabular-nums">
                {Math.round((metadata.flip.probability || 0) * 100)}% chance
              </span>
            )}
          </div>

          {metadata.flip?.enabled ? (
            <>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round((metadata.flip.probability || 0) * 100)}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    flip: {
                      enabled: true,
                      probability: Number.parseFloat(e.target.value) / 100,
                    },
                  }))
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Independent vertical flip applied after primary edit. Updates YOLO coordinates.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-slate-500 pt-1.5">
              Enable to apply a secondary vertical flip with configurable probability.
            </p>
          )}
        </div>
      </div>

      {/* Round-Robin Edit Allocation Bar */}
      {metadata.edits.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-semibold text-slate-300">
              Round-Robin Edit Quota Allocation (per source image):
            </span>
            <span className="text-slate-400 font-mono">
              Total outputs: {imageCount} images × {metadata.count} ={' '}
              <strong className="text-white">{totalGenerated} results</strong>
            </span>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
            {distribution.map((d, i) => {
              const colors = [
                'bg-indigo-500',
                'bg-sky-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-rose-500',
                'bg-teal-500',
                'bg-orange-500',
              ];
              const color = colors[i % colors.length];
              const pct = (d.allocatedCount / metadata.count) * 100;
              return (
                <div
                  key={d.edit.action + i}
                  style={{ width: `${pct}%` }}
                  className={`${color} transition-all`}
                  title={`${d.label}: ${d.allocatedCount} results (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
            {distribution.map((d, i) => (
              <span key={d.edit.action + i} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full inline-block"
                  style={{
                    backgroundColor: [
                      '#6366f1',
                      '#0ea5e9',
                      '#10b981',
                      '#f59e0b',
                      '#a855f7',
                      '#f43f5e',
                      '#14b8a6',
                      '#f97316',
                    ][i % 8],
                  }}
                />
                <span className="text-slate-300 font-medium">{d.edit.action}:</span>
                <span className="font-mono text-slate-400">
                  {d.allocatedCount} / {metadata.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Augmentation Techniques Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Augmentation Techniques ({metadata.edits.length} Selected)
          </h2>
          <span className="text-xs text-slate-500">
            Select techniques to include in round-robin allocation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Rotate */}
          <EditCard
            title="Rotate"
            actionType="rotate"
            icon={<RotateCw className="h-4 w-4 text-indigo-400" />}
            enabled={isActionEnabled('rotate')}
            onToggle={() =>
              toggleAction('rotate', { action: 'rotate', range: { min: -15, max: 15 } })
            }
          >
            {isActionEnabled('rotate') && (
              <MinMaxSlider
                minLimit={-360}
                maxLimit={360}
                unit="°"
                value={(getAction('rotate') as any)?.range || { min: -15, max: 15 }}
                onChange={(range) => updateEdit({ action: 'rotate', range })}
              />
            )}
          </EditCard>

          {/* 2. Resize */}
          <EditCard
            title="Resize"
            actionType="resize"
            icon={<Scaling className="h-4 w-4 text-sky-400" />}
            enabled={isActionEnabled('resize')}
            onToggle={() =>
              toggleAction('resize', {
                action: 'resize',
                resize: { width: 400, height: 0 },
              })
            }
          >
            {isActionEnabled('resize') && (
              <ResizeInput
                value={(getAction('resize') as any)?.resize || { width: 400, height: 0 }}
                onChange={(resize) => updateEdit({ action: 'resize', resize })}
              />
            )}
          </EditCard>

          {/* 3. Random Crop */}
          <EditCard
            title="Random Crop"
            actionType="randomCrop"
            icon={<Crop className="h-4 w-4 text-emerald-400" />}
            enabled={isActionEnabled('randomCrop')}
            onToggle={() =>
              toggleAction('randomCrop', {
                action: 'randomCrop',
                randomCrop: {
                  width: { min: 0.7, max: 1.0 },
                  height: { min: 0.7, max: 1.0 },
                },
              })
            }
          >
            {isActionEnabled('randomCrop') && (
              <RandomCropInput
                value={
                  (getAction('randomCrop') as any)?.randomCrop || {
                    width: { min: 0.7, max: 1.0 },
                    height: { min: 0.7, max: 1.0 },
                  }
                }
                onChange={(randomCrop) => updateEdit({ action: 'randomCrop', randomCrop })}
              />
            )}
          </EditCard>

          {/* 4. Random Scale */}
          <EditCard
            title="Random Scale"
            actionType="randomScale"
            icon={<Maximize2 className="h-4 w-4 text-amber-400" />}
            enabled={isActionEnabled('randomScale')}
            onToggle={() =>
              toggleAction('randomScale', {
                action: 'randomScale',
                range: { min: 0.8, max: 1.2 },
              })
            }
          >
            {isActionEnabled('randomScale') && (
              <MinMaxSlider
                minLimit={0.1}
                maxLimit={4.0}
                step={0.05}
                unit="x"
                value={(getAction('randomScale') as any)?.range || { min: 0.8, max: 1.2 }}
                onChange={(range) => updateEdit({ action: 'randomScale', range })}
              />
            )}
          </EditCard>

          {/* 5. Brightness */}
          <EditCard
            title="Brightness"
            actionType="brightness"
            icon={<Sun className="h-4 w-4 text-yellow-400" />}
            enabled={isActionEnabled('brightness')}
            onToggle={() =>
              toggleAction('brightness', {
                action: 'brightness',
                range: { min: -20, max: 20 },
              })
            }
          >
            {isActionEnabled('brightness') && (
              <MinMaxSlider
                minLimit={-100}
                maxLimit={100}
                unit="%"
                value={(getAction('brightness') as any)?.range || { min: -20, max: 20 }}
                onChange={(range) => updateEdit({ action: 'brightness', range })}
              />
            )}
          </EditCard>

          {/* 6. Contrast */}
          <EditCard
            title="Contrast"
            actionType="contrast"
            icon={<Contrast className="h-4 w-4 text-purple-400" />}
            enabled={isActionEnabled('contrast')}
            onToggle={() =>
              toggleAction('contrast', {
                action: 'contrast',
                range: { min: -20, max: 20 },
              })
            }
          >
            {isActionEnabled('contrast') && (
              <MinMaxSlider
                minLimit={-100}
                maxLimit={100}
                unit="%"
                value={(getAction('contrast') as any)?.range || { min: -20, max: 20 }}
                onChange={(range) => updateEdit({ action: 'contrast', range })}
              />
            )}
          </EditCard>

          {/* 7. Saturation */}
          <EditCard
            title="Saturation"
            actionType="saturation"
            icon={<Sliders className="h-4 w-4 text-teal-400" />}
            enabled={isActionEnabled('saturation')}
            onToggle={() =>
              toggleAction('saturation', {
                action: 'saturation',
                range: { min: -30, max: 30 },
              })
            }
          >
            {isActionEnabled('saturation') && (
              <MinMaxSlider
                minLimit={-100}
                maxLimit={100}
                unit="%"
                value={(getAction('saturation') as any)?.range || { min: -30, max: 30 }}
                onChange={(range) => updateEdit({ action: 'saturation', range })}
              />
            )}
          </EditCard>

          {/* 8. Hue */}
          <EditCard
            title="Hue Shift"
            actionType="hue"
            icon={<Palette className="h-4 w-4 text-pink-400" />}
            enabled={isActionEnabled('hue')}
            onToggle={() =>
              toggleAction('hue', { action: 'hue', range: { min: -30, max: 30 } })
            }
          >
            {isActionEnabled('hue') && (
              <MinMaxSlider
                minLimit={-360}
                maxLimit={360}
                unit="°"
                value={(getAction('hue') as any)?.range || { min: -30, max: 30 }}
                onChange={(range) => updateEdit({ action: 'hue', range })}
              />
            )}
          </EditCard>

          {/* 9. Exposure */}
          <EditCard
            title="Exposure"
            actionType="exposure"
            icon={<Zap className="h-4 w-4 text-orange-400" />}
            enabled={isActionEnabled('exposure')}
            onToggle={() =>
              toggleAction('exposure', { action: 'exposure', range: { min: -1, max: 1 } })
            }
          >
            {isActionEnabled('exposure') && (
              <MinMaxSlider
                minLimit={-10}
                maxLimit={10}
                step={0.2}
                unit=" stops"
                value={(getAction('exposure') as any)?.range || { min: -1, max: 1 }}
                onChange={(range) => updateEdit({ action: 'exposure', range })}
              />
            )}
          </EditCard>

          {/* 10. Gaussian Blur */}
          <EditCard
            title="Gaussian Blur"
            actionType="blur"
            icon={<Droplets className="h-4 w-4 text-blue-400" />}
            enabled={isActionEnabled('blur')}
            onToggle={() =>
              toggleAction('blur', { action: 'blur', range: { min: 0.5, max: 3 } })
            }
          >
            {isActionEnabled('blur') && (
              <MinMaxSlider
                minLimit={0}
                maxLimit={100}
                step={0.5}
                unit=" σ"
                value={(getAction('blur') as any)?.range || { min: 0.5, max: 3 }}
                onChange={(range) => updateEdit({ action: 'blur', range })}
              />
            )}
          </EditCard>

          {/* 11. Gaussian Noise */}
          <EditCard
            title="Gaussian Noise"
            actionType="gaussianNoise"
            icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
            enabled={isActionEnabled('gaussianNoise')}
            onToggle={() =>
              toggleAction('gaussianNoise', {
                action: 'gaussianNoise',
                range: { min: 5, max: 30 },
              })
            }
          >
            {isActionEnabled('gaussianNoise') && (
              <MinMaxSlider
                minLimit={0}
                maxLimit={255}
                unit=" σ"
                value={(getAction('gaussianNoise') as any)?.range || { min: 5, max: 30 }}
                onChange={(range) => updateEdit({ action: 'gaussianNoise', range })}
              />
            )}
          </EditCard>

          {/* 12. Change Format */}
          <EditCard
            title="Format Override"
            actionType="changeFormat"
            icon={<FileType className="h-4 w-4 text-slate-300" />}
            enabled={isActionEnabled('changeFormat')}
            onToggle={() =>
              toggleAction('changeFormat', { action: 'changeFormat', format: 'jpeg' })
            }
          >
            {isActionEnabled('changeFormat') && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-slate-400">Target Image Format</label>
                <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800">
                  {(['png', 'jpg', 'jpeg'] as OutputFormat[]).map((fmt) => {
                    const current = (getAction('changeFormat') as any)?.format || 'jpeg';
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() =>
                          updateEdit({ action: 'changeFormat', format: fmt })
                        }
                        className={`flex-1 rounded py-1 text-xs font-semibold uppercase transition-colors ${
                          current === fmt
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </EditCard>
        </div>
      </div>

      {/* Target Backend & Execution Settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Execution Environment & Backend Target</h3>
            <p className="text-xs text-slate-400">
              Select how the multipart form request and ZIP generation is executed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCurlModal(!showCurlModal)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              <span>{showCurlModal ? 'Hide API Payload' : 'Inspect API Request'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label
            className={`flex flex-col p-3.5 rounded-lg border cursor-pointer transition-colors ${
              targetBackendMode === 'proxy'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-400" />
                Go Backend Proxy
              </span>
              <input
                type="radio"
                name="backendMode"
                value="proxy"
                checked={targetBackendMode === 'proxy'}
                onChange={() => setTargetBackendMode('proxy')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Forwards multipart form to <code className="text-indigo-300 font-mono">localhost:3001</code> via Next.js proxy route (avoids CORS issues).
            </p>
          </label>

          <label
            className={`flex flex-col p-3.5 rounded-lg border cursor-pointer transition-colors ${
              targetBackendMode === 'client'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-400" />
                In-Browser Engine (Offline)
              </span>
              <input
                type="radio"
                name="backendMode"
                value="client"
                checked={targetBackendMode === 'client'}
                onChange={() => setTargetBackendMode('client')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Transforms images in-browser via Canvas & builds <code className="text-emerald-300 font-mono">results.zip</code> client-side (no Go server needed).
            </p>
          </label>

          <label
            className={`flex flex-col p-3.5 rounded-lg border cursor-pointer transition-colors ${
              targetBackendMode === 'direct'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-2">
                <Server className="h-4 w-4 text-sky-400" />
                Custom Direct URL
              </span>
              <input
                type="radio"
                name="backendMode"
                value="direct"
                checked={targetBackendMode === 'direct'}
                onChange={() => setTargetBackendMode('direct')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Send direct browser fetch to custom URL.
            </p>
          </label>
        </div>

        {targetBackendMode === 'direct' && (
          <div className="pt-2">
            <label className="text-xs font-medium text-slate-300">Custom Backend URL</label>
            <input
              type="text"
              value={customBackendUrl}
              onChange={(e) => setCustomBackendUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="http://localhost:3001/images/transform"
            />
          </div>
        )}

        {/* API Inspection Drawer */}
        {showCurlModal && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-300 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                Equivalent cURL Command
              </span>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedCurl ? 'Copied!' : 'Copy cURL'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-[11px] text-indigo-200">
              {curlString}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-xs text-slate-300">
                Multipart JSON <code className="text-indigo-400 font-mono">metadata</code> Payload
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-[11px] text-emerald-200">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-5">
        <button
          type="button"
          onClick={onBackToUpload}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ← Back to Source Data
        </button>

        <div className="flex items-center gap-4">
          {hasNoEdits && (
            <span className="text-xs text-rose-400">Select at least one edit technique.</span>
          )}
          {isCountTooLow && (
            <span className="text-xs text-amber-400">
              Count ({metadata.count}) must be ≥ selected edits ({metadata.edits.length}).
            </span>
          )}
          {isOverGenerated && (
            <span className="text-xs text-rose-400">
              Total results ({totalGenerated}) exceeds {MAX_TOTAL_GENERATED} max.
            </span>
          )}

          <button
            type="button"
            disabled={hasNoEdits || isCountTooLow || isOverGenerated || imageCount === 0}
            onClick={onStartProcessing}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Run Pipeline & Generate results.zip</span>
            <span className="rounded bg-indigo-700/80 px-1.5 py-0.5 font-mono text-[11px]">
              {totalGenerated} outputs
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCard({
  title,
  actionType,
  icon,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  actionType: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-4 transition-all ${
        enabled
          ? 'border-indigo-500/60 bg-indigo-950/20 ring-1 ring-indigo-500/20'
          : 'border-slate-800 bg-slate-900/40 opacity-75 hover:opacity-100 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between pb-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-800 border border-slate-700">{icon}</span>
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
        </label>
        <span className="font-mono text-[10px] text-slate-500 uppercase">{actionType}</span>
      </div>

      <div className="mt-auto">{children}</div>
    </div>
  );
}

function MinMaxSlider({
  minLimit,
  maxLimit,
  unit,
  step = 1,
  value,
  onChange,
}: {
  minLimit: number;
  maxLimit: number;
  unit: string;
  step?: number;
  value: { min: number; max: number };
  onChange: (val: { min: number; max: number }) => void;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-800/80">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Random Range:</span>
        <span className="font-mono text-indigo-300 font-semibold tabular-nums">
          [{value.min}
          {unit} .. {value.max}
          {unit}]
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-slate-500">Min</span>
          <input
            type="range"
            min={minLimit}
            max={value.max}
            step={step}
            value={value.min}
            onChange={(e) =>
              onChange({ ...value, min: Math.min(Number.parseFloat(e.target.value), value.max) })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
        <div>
          <span className="text-[10px] text-slate-500">Max</span>
          <input
            type="range"
            min={value.min}
            max={maxLimit}
            step={step}
            value={value.max}
            onChange={(e) =>
              onChange({ ...value, max: Math.max(Number.parseFloat(e.target.value), value.min) })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

function ResizeInput({
  value,
  onChange,
}: {
  value: { width: number; height: number };
  onChange: (val: { width: number; height: number }) => void;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400">Width (px)</label>
          <input
            type="number"
            min="0"
            max="2000"
            value={value.width}
            onChange={(e) =>
              onChange({ ...value, width: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })
            }
            className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1 font-mono text-xs text-white"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400">Height (px)</label>
          <input
            type="number"
            min="0"
            max="2000"
            value={value.height}
            onChange={(e) =>
              onChange({ ...value, height: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })
            }
            className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1 font-mono text-xs text-white"
            placeholder="0"
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-500 italic">
        * Set 0 on either width or height to preserve source aspect ratio.
      </p>
    </div>
  );
}

function RandomCropInput({
  value,
  onChange,
}: {
  value: { width: { min: number; max: number }; height: { min: number; max: number } };
  onChange: (val: {
    width: { min: number; max: number };
    height: { min: number; max: number };
  }) => void;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-400">Width Fraction:</span>
          <span className="font-mono text-indigo-300 tabular-nums">
            {Math.round(value.width.min * 100)}% – {Math.round(value.width.max * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="range"
            min="10"
            max={Math.round(value.width.max * 100)}
            value={Math.round(value.width.min * 100)}
            onChange={(e) =>
              onChange({
                ...value,
                width: {
                  ...value.width,
                  min: Number.parseInt(e.target.value, 10) / 100,
                },
              })
            }
            className="accent-indigo-500"
          />
          <input
            type="range"
            min={Math.round(value.width.min * 100)}
            max="100"
            value={Math.round(value.width.max * 100)}
            onChange={(e) =>
              onChange({
                ...value,
                width: {
                  ...value.width,
                  max: Number.parseInt(e.target.value, 10) / 100,
                },
              })
            }
            className="accent-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-400">Height Fraction:</span>
          <span className="font-mono text-indigo-300 tabular-nums">
            {Math.round(value.height.min * 100)}% – {Math.round(value.height.max * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="range"
            min="10"
            max={Math.round(value.height.max * 100)}
            value={Math.round(value.height.min * 100)}
            onChange={(e) =>
              onChange({
                ...value,
                height: {
                  ...value.height,
                  min: Number.parseInt(e.target.value, 10) / 100,
                },
              })
            }
            className="accent-indigo-500"
          />
          <input
            type="range"
            min={Math.round(value.height.min * 100)}
            max="100"
            value={Math.round(value.height.max * 100)}
            onChange={(e) =>
              onChange({
                ...value,
                height: {
                  ...value.height,
                  max: Number.parseInt(e.target.value, 10) / 100,
                },
              })
            }
            className="accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
