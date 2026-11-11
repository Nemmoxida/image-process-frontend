'use client';

import React from 'react';
import { X, FileCode2, Terminal, Layers, CheckCircle2 } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiDocsModal({ isOpen, onClose }: ApiDocsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative max-w-3xl w-full my-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Backend API Specification</h2>
              <p className="text-xs text-slate-400">
                Documentation for <code className="text-indigo-300 font-mono">POST /images/transform</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Overview */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Endpoint & Content-Type</h3>
            <p>
              The Go backend server listens by default on port <code className="font-mono text-indigo-300">3001</code>.
              Batch transformations are sent to <code className="font-mono text-indigo-300">POST /images/transform</code> using{' '}
              <strong className="text-white">multipart/form-data</strong>.
            </p>
          </section>

          {/* Multipart Form Fields */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Multipart Form Fields</h3>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-300">
              <li>
                <code className="font-mono text-indigo-300 font-semibold">image</code>: Repeat this field once for each source image (up to 50). Supported formats: <span className="text-white font-mono">.png, .jpg, .jpeg</span>. Each image must be ≤ 400 KiB and ≤ 500px in dimensions.
              </li>
              <li>
                <code className="font-mono text-indigo-300 font-semibold">annotation</code>: Optional YOLO <span className="text-white font-mono">.txt</span> file for each image. If provided, every image must have exactly one annotation with the identical stem name (e.g. <span className="font-mono text-white">image_1.png</span> and <span className="font-mono text-white">image_1.txt</span>).
              </li>
              <li>
                <code className="font-mono text-indigo-300 font-semibold">metadata</code>: JSON string containing pipeline parameters: <span className="text-white font-mono">count</span> (1–50), <span className="text-white font-mono">ext</span>, <span className="text-white font-mono">edits</span> array, and optional <span className="text-white font-mono">flip</span> object.
              </li>
            </ul>
          </section>

          {/* Folder Upload Convention */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Dataset Folder Convention</h3>
            <p>
              When uploading a folder, the directory must contain two subfolders:
            </p>
            <pre className="rounded bg-slate-900 p-3 font-mono text-xs text-slate-300">
{`my_dataset/
├── image/
│   ├── image_1.png
│   └── image_2.jpg
└── annotation/
    ├── image_1.txt
    └── image_2.txt`}
            </pre>
          </section>

          {/* YOLO Annotation Format */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white">YOLO Annotation Format</h3>
            <p>
              Each non-empty line of the annotation file consists of 5 space-separated values:
            </p>
            <pre className="rounded bg-slate-900 p-2.5 font-mono text-xs text-emerald-300">
              class_id x_center y_center width height
            </pre>
            <p className="text-[11px] text-slate-400">
              All coordinates and dimensions are normalized floats between <span className="font-mono text-white">0.0</span> and <span className="font-mono text-white">1.0</span>.
            </p>
          </section>

          {/* Output Archive */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Response Format (results.zip)</h3>
            <p>
              The response is a ZIP file named <code className="font-mono text-white">results.zip</code>. Outputs are organized into folders by source image:
            </p>
            <pre className="rounded bg-slate-900 p-3 font-mono text-xs text-slate-300">
{`results.zip/
├── image_1/
│   ├── result_001.png
│   ├── result_001.txt
│   ├── result_002.png
│   └── result_002.txt
└── image_2/
    ├── result_001.png
    └── result_001.txt`}
            </pre>
          </section>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
