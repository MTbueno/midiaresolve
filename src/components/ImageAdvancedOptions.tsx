
"use client";
import type { OriginalDimensions } from '@/app/page';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Crop } from 'lucide-react';

interface ImageAdvancedOptionsProps {
  scalePercentage: number;
  onScalePercentageChange: (value: number) => void;
  outputWidth: string;
  onOutputWidthChange: (value: string) => void;
  outputHeight: string;
  onOutputHeightChange: (value: string) => void;
  isCropping: boolean;
  originalDimensions: OriginalDimensions;
}

export function ImageAdvancedOptions({
  scalePercentage,
  onScalePercentageChange,
  outputWidth,
  onOutputWidthChange,
  outputHeight,
  onOutputHeightChange,
  isCropping,
  originalDimensions,
}: ImageAdvancedOptionsProps) {
  return (
    <div className="space-y-6 py-4 border-t border-border mt-4 pt-6">
      <div className="space-y-2">
        <Label htmlFor="scale-slider" className="text-base font-semibold">
          Scale Proportionally: {scalePercentage}%
        </Label>
        <Slider
          id="scale-slider"
          min={1}
          max={100}
          step={1}
          value={[scalePercentage]}
          onValueChange={(value) => onScalePercentageChange(value[0])}
          disabled={!!(outputWidth || outputHeight)} // Disable if manual dimensions are set
        />
         {!!(outputWidth || outputHeight) && (
          <p className="text-xs text-muted-foreground">
            Slider disabled when manual dimensions are set. Clear dimensions to enable.
          </p>
        )}
      </div>

      <div className="space-y-1 text-center text-sm text-muted-foreground">Or</div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="output-width" className="text-base font-semibold">Width (px)</Label>
          <Input
            id="output-width"
            type="number"
            min="1"
            placeholder={`e.g. ${originalDimensions.width}`}
            value={outputWidth}
            onChange={(e) => onOutputWidthChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="output-height" className="text-base font-semibold">Height (px)</Label>
          <Input
            id="output-height"
            type="number"
            min="1"
            placeholder={`e.g. ${originalDimensions.height}`}
            value={outputHeight}
            onChange={(e) => onOutputHeightChange(e.target.value)}
          />
        </div>
      </div>
      
      {isCropping && (
        <div className="flex items-center text-xs text-amber-600 dark:text-amber-500 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
          <Crop className="w-4 h-4 mr-2 shrink-0" />
          <span>
            Aspect ratio changed. Image will be cropped from the center to fit new dimensions. 
            Original: {originalDimensions.width}x{originalDimensions.height}px.
          </span>
        </div>
      )}
    </div>
  );
}
