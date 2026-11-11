import { YoloBBox } from './augmentation-types';

export interface SampleItem {
  stem: string;
  imageFileName: string;
  annotationFileName: string;
  width: number;
  height: number;
  svgDataUri: string;
  annotationText: string;
  bboxes: YoloBBox[];
}

export const SAMPLE_DATASETS: SampleItem[] = [
  {
    stem: 'image_1',
    imageFileName: 'image_1.png',
    annotationFileName: 'image_1.txt',
    width: 320,
    height: 240,
    annotationText: '0 0.45 0.55 0.42 0.38\n1 0.78 0.35 0.22 0.28',
    bboxes: [
      { classId: 0, xCenter: 0.45, yCenter: 0.55, width: 0.42, height: 0.38 },
      { classId: 1, xCenter: 0.78, yCenter: 0.35, width: 0.22, height: 0.28 },
    ],
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#bg1)"/>
        <!-- Road / Terrain -->
        <polygon points="0,240 120,130 200,130 320,240" fill="#334155" opacity="0.6"/>
        <line x1="160" y1="130" x2="160" y2="240" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8 6"/>
        <!-- Vehicle (Class 0) -->
        <rect x="80" y="85" width="130" height="90" rx="8" fill="#3b82f6" stroke="#60a5fa" stroke-width="2"/>
        <rect x="100" y="95" width="90" height="40" rx="4" fill="#93c5fd" opacity="0.8"/>
        <circle cx="105" cy="180" r="14" fill="#1e293b" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="185" cy="180" r="14" fill="#1e293b" stroke="#cbd5e1" stroke-width="3"/>
        <!-- Traffic Sign (Class 1) -->
        <rect x="240" y="110" width="8" height="80" fill="#94a3b8"/>
        <polygon points="244,50 215,100 273,100" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <text x="244" y="85" font-family="sans-serif" font-weight="bold" font-size="12" fill="#ffffff" text-anchor="middle">STOP</text>
        <text x="14" y="24" font-family="monospace" font-size="11" fill="#94a3b8">#01 Urban Scene (320x240)</text>
      </svg>
    `)}`,
  },
  {
    stem: 'image_2',
    imageFileName: 'image_2.png',
    annotationFileName: 'image_2.txt',
    width: 320,
    height: 240,
    annotationText: '0 0.50 0.50 0.60 0.50',
    bboxes: [
      { classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.6, height: 0.5 },
    ],
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
        <defs>
          <radialGradient id="bg2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#090d16"/>
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill="url(#bg2)"/>
        <!-- Industrial Component (Class 0) -->
        <circle cx="160" cy="120" r="60" fill="#475569" stroke="#38bdf8" stroke-width="3"/>
        <circle cx="160" cy="120" r="35" fill="#1e293b" stroke="#e2e8f0" stroke-width="2"/>
        <circle cx="160" cy="120" r="12" fill="#0284c7"/>
        <!-- Fastener bolts -->
        <circle cx="160" cy="75" r="4" fill="#f8fafc"/>
        <circle cx="160" cy="165" r="4" fill="#f8fafc"/>
        <circle cx="115" cy="120" r="4" fill="#f8fafc"/>
        <circle cx="205" cy="120" r="4" fill="#f8fafc"/>
        <text x="14" y="24" font-family="monospace" font-size="11" fill="#94a3b8">#02 Industrial Bearing (320x240)</text>
      </svg>
    `)}`,
  },
  {
    stem: 'image_3',
    imageFileName: 'image_3.png',
    annotationFileName: 'image_3.txt',
    width: 320,
    height: 240,
    annotationText: '2 0.35 0.50 0.28 0.60\n2 0.70 0.55 0.30 0.50',
    bboxes: [
      { classId: 2, xCenter: 0.35, yCenter: 0.5, width: 0.28, height: 0.6 },
      { classId: 2, xCenter: 0.7, yCenter: 0.55, width: 0.3, height: 0.5 },
    ],
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
        <defs>
          <linearGradient id="bg3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#bg3)"/>
        <!-- Pedestrian 1 (Class 2) -->
        <circle cx="112" cy="70" r="14" fill="#ec4899"/>
        <rect x="96" y="88" width="32" height="60" rx="6" fill="#a855f7"/>
        <line x1="104" y1="148" x2="100" y2="190" stroke="#a855f7" stroke-width="6" stroke-linecap="round"/>
        <line x1="120" y1="148" x2="124" y2="190" stroke="#a855f7" stroke-width="6" stroke-linecap="round"/>
        <!-- Pedestrian 2 (Class 2) -->
        <circle cx="224" cy="90" r="13" fill="#fb923c"/>
        <rect x="210" y="106" width="28" height="52" rx="5" fill="#f97316"/>
        <line x1="216" y1="158" x2="212" y2="194" stroke="#f97316" stroke-width="5" stroke-linecap="round"/>
        <line x1="230" y1="158" x2="234" y2="194" stroke="#f97316" stroke-width="5" stroke-linecap="round"/>
        <text x="14" y="24" font-family="monospace" font-size="11" fill="#94a3b8">#03 Pedestrians (320x240)</text>
      </svg>
    `)}`,
  },
];

export async function createSampleFiles(): Promise<File[]> {
  const files: File[] = [];

  for (const item of SAMPLE_DATASETS) {
    // Convert SVG data URI to PNG Blob via Canvas
    const blob = await svgDataUriToBlob(item.svgDataUri, item.width, item.height);
    const imgFile = new File([blob], item.imageFileName, { type: 'image/png' });
    const annBlob = new Blob([item.annotationText], { type: 'text/plain' });
    const annFile = new File([annBlob], item.annotationFileName, { type: 'text/plain' });

    files.push(imgFile);
    files.push(annFile);
  }

  return files;
}

function svgDataUriToBlob(dataUri: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      // Server fallback: return raw SVG blob
      resolve(new Blob([dataUri], { type: 'image/svg+xml' }));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to render sample SVG to image'));
    img.src = dataUri;
  });
}
