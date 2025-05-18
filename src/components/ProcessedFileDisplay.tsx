"use client";
import { Download, FileCheck2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface ProcessedFile {
  name: string;
  url: string;
  originalSize: number;
  newSize: number;
  type: string;
}

interface ProcessedFileDisplayProps {
  processedFile: ProcessedFile;
}

export function ProcessedFileDisplay({ processedFile }: ProcessedFileDisplayProps) {
  const compressionPercentage = processedFile.originalSize > 0 
    ? ((processedFile.originalSize - processedFile.newSize) / processedFile.originalSize * 100).toFixed(1)
    : "0";

  return (
    <div className="my-6 p-6 border border-primary/50 rounded-lg bg-muted/30 shadow-md text-center space-y-4">
      <div className="flex justify-center">
        <FileCheck2 className="w-12 h-12 text-green-500" />
      </div>
      <h3 className="text-lg font-semibold">Compression Successful!</h3>
      <p className="text-sm text-muted-foreground truncate" title={processedFile.name}>
        {processedFile.name}
      </p>
      <div className="flex justify-center items-center space-x-2 text-sm">
        <span>{formatFileSize(processedFile.originalSize)}</span>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-primary">{formatFileSize(processedFile.newSize)}</span>
      </div>
       <Badge variant="secondary">Reduced by {compressionPercentage}%</Badge>
      
      <a
        href={processedFile.url}
        download={processedFile.name}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4 cursor-grab w-full sm:w-auto"
        draggable="true"
        onDragStart={(e) => {
          // For browsers that support it, set the download URL for drag operations
          if (e.dataTransfer.setData) {
            e.dataTransfer.setData('DownloadURL', `${processedFile.type}:${processedFile.name}:${processedFile.url}`);
          }
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Drag to Export or Click to Download
      </a>
    </div>
  );
}
