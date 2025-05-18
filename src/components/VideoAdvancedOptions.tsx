
"use client";
import type { VideoInfo } from "@/app/page";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import type { ResolutionOption } from "@/lib/videoUtils";
import { getVideoResolutionOptions } from "@/lib/videoUtils";

export type VideoResolution = 'original' | 'hd' | 'fullhd' | '2k' | '4k';

interface VideoAdvancedOptionsProps {
  videoInfo: VideoInfo;
  targetResolution: VideoResolution;
  onTargetResolutionChange: (value: VideoResolution) => void;
}

export function VideoAdvancedOptions({
  videoInfo,
  targetResolution,
  onTargetResolutionChange,
}: VideoAdvancedOptionsProps) {
  const availableOptions = getVideoResolutionOptions(videoInfo.width, videoInfo.height);

  return (
    <div className="space-y-4 py-4 border-t border-border mt-4 pt-6">
      <div className="flex items-center space-x-2 mb-3">
        <Settings2 className="h-5 w-5 text-primary" />
        <Label htmlFor="video-resolution-select" className="text-base font-semibold">
          Target Video Resolution
        </Label>
      </div>
      <Select
        value={targetResolution}
        onValueChange={(value) => onTargetResolutionChange(value as VideoResolution)}
      >
        <SelectTrigger id="video-resolution-select" className="w-full">
          <SelectValue placeholder="Select target resolution" />
        </SelectTrigger>
        <SelectContent>
          {availableOptions.map((option: ResolutionOption) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.width && option.height && ` (${option.width}x${option.height}px)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Note: Video resolution conversion is simulated. The downloaded file will contain the original video content but may be renamed.
      </p>
    </div>
  );
}

    