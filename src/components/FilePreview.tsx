
"use client";
import type { VideoInfo } from '@/app/page'; // Added
import { FileImage, FileVideo, File as FileIcon, XCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Added

interface FilePreviewProps {
  file: File;
  onClear?: () => void;
  videoInfo?: VideoInfo | null; // Added
}

export function FilePreview({ file, onClear, videoInfo }: FilePreviewProps) {
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return <FileImage className="w-10 h-10 text-primary" />;
    if (file.type.startsWith('video/')) return <FileVideo className="w-10 h-10 text-primary" />;
    return <FileIcon className="w-10 h-10 text-primary" />;
  };

  return (
    <div className="my-6 p-4 border border-border rounded-lg bg-muted/30 shadow-sm relative">
      {onClear && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="absolute top-2 right-2 h-7 w-7"
          aria-label="Clear file"
        >
          <XCircle className="w-5 h-5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
      <div className="flex items-center space-x-4">
        {getFileIcon()}
        <div className="flex-grow overflow-hidden">
          <p className="font-semibold text-sm truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.type} - {formatFileSize(file.size)}
          </p>
          {videoInfo && file.type.startsWith('video/') && (
            <Badge variant="outline" className="mt-1 text-xs">
              Original: {videoInfo.label} ({videoInfo.width}x{videoInfo.height}px)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

    