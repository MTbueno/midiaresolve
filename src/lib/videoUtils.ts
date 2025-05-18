
export type VideoResolutionValue = 'original' | 'hd' | 'fullhd' | '2k' | '4k';

export interface ResolutionOption {
  value: VideoResolutionValue;
  label: string;
  width?: number;
  height?: number;
}

export function getResolutionLabel(width: number, height: number): string {
  if (width === 0 || height === 0) return 'Unknown';
  // Check common 4K UHD variations
  if ((width >= 3840 && height >= 2160) || (width >= 4096 && height >= 2160)) return '4K UHD';
  // Check common 2K QHD variations
  if ((width >= 2560 && height >= 1440)) return '2K QHD';
  // Check common FullHD variations
  if ((width >= 1920 && height >= 1080)) return 'FullHD';
  // Check common HD variations
  if ((width >= 1280 && height >= 720)) return 'HD';
  
  // More granular checks for slightly off common ratios (e.g. DCI 2K/4K)
  // Example: DCI 4K is 4096x2160, DCI 2K is 2048x1080
  if (width > 3000 && height > 1800) return 'approx. 4K';
  if (width > 2000 && height > 1000) return 'approx. 2K';
  if (width > 1800 && height > 900) return 'approx. FullHD';
  if (width > 1000 && height > 600) return 'approx. HD';

  if (height >= 1080) return '1080p+';
  if (height >= 720) return '720p+';
  if (height >= 480) return '480p+';
  
  return `${width}x${height}`; // Custom or SD
}

const ALL_RESOLUTION_OPTIONS: ResolutionOption[] = [
  { value: 'hd', label: 'HD', width: 1280, height: 720 },
  { value: 'fullhd', label: 'FullHD', width: 1920, height: 1080 },
  { value: '2k', label: '2K QHD', width: 2560, height: 1440 },
  { value: '4k', label: '4K UHD', width: 3840, height: 2160 },
];

export function getVideoResolutionOptions(originalWidth: number, originalHeight: number): ResolutionOption[] {
  const originalLabel = getResolutionLabel(originalWidth, originalHeight);
  const options: ResolutionOption[] = [
    { value: 'original', label: `Original (${originalLabel})` },
  ];

  ALL_RESOLUTION_OPTIONS.forEach(opt => {
    // Only add if option is smaller than or equal to original in both dimensions
    // And not identical to original (unless original is one of these exact resolutions, then 'original' handles it)
    if (opt.width && opt.height && opt.width <= originalWidth && opt.height <= originalHeight) {
       // Avoid adding if it's essentially the same as 'Original'
      if (opt.width !== originalWidth || opt.height !== originalHeight) {
        options.push(opt);
      }
    }
  });
  return options;
}

    