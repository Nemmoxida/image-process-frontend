'use client';

import React from 'react';
import { Layers, FileCode2, ExternalLink, Sparkles } from 'lucide-react';

interface TopNavigationProps {
  activeTab: 'upload' | 'config' | 'results';
  setActiveTab: (tab: 'upload' | 'config' | 'results') => void;
  onOpenDocs: () => void;
  imageCount: number;
  resultCount: number;
}

export function TopNavigation({
  activeTab,
  setActiveTab,
  onOpenDocs,
  imageCount,
  resultCount,
}: TopNavigationProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            Image Augmentation Processing
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('upload')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
              activeTab === 'upload' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            1. Source Data {imageCount > 0 && `(${imageCount})`}
          </button>
          <span className="text-slate-700" aria-hidden="true">/</span>
          <button
            onClick={() => setActiveTab('config')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
              activeTab === 'config' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            2. Augmentation Pipeline
          </button>
          <span className="text-slate-700" aria-hidden="true">/</span>
          <button
            onClick={() => setActiveTab('results')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
              activeTab === 'results' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            3. Results & ZIP {resultCount > 0 && `(${resultCount})`}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <FileCode2 className="h-3.5 w-3.5 text-slate-400" />
            <span>API Specs</span>
          </button>
        </div>
      </div>
    </header>
  );
}
