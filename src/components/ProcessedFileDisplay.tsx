
"use client";
import { Download, FileCheck2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ProcessedResult {
  id: string;
  name: string;
  url: string; // Object URL
  originalSize: number;
  newSize: number;
  type: string;
  error?: string; // Optional error message
}

interface ProcessedFileDisplayProps {
  processedFiles: ProcessedResult[];
}

export function ProcessedFileDisplay({ processedFiles }: ProcessedFileDisplayProps) {
  if (!processedFiles || processedFiles.length === 0) {
    return null;
  }

  return (
    <div className="my-6 p-4 border border-primary/50 rounded-lg bg-muted/30 shadow-md text-left space-y-4">
      <h3 className="text-lg font-semibold text-center mb-4">Processing Results</h3>
      <ScrollArea className="h-60 w-full pr-3">
        <ul className="space-y-3">
          {processedFiles.map((file) => {
            const compressionPercentage = file.originalSize > 0 && !file.error
              ? ((file.originalSize - file.newSize) / file.originalSize * 100).toFixed(1)
              : "0";

            return (
              <li key={file.id} className="p-3 border border-border rounded-md bg-background/70">
                {file.error ? (
                  <div className="text-destructive">
                    <div className="flex items-center font-semibold">
                      <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
                      <span>{file.name} (Failed)</span>
                    </div>
                    <p className="text-xs mt-1">{file.error}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <FileCheck2 className="w-5 h-5 text-green-500 shrink-0" />
                            <p className="text-sm font-medium truncate" title={file.name}>
                                {file.name}
                            </p>
                        </div>
                         <Badge variant="secondary">Reduced by {compressionPercentage}%</Badge>
                    </div>
                    <div className="flex justify-start items-center space-x-2 text-xs text-muted-foreground mt-1">
                      <span>{formatFileSize(file.originalSize)}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-semibold text-primary">{formatFileSize(file.newSize)}</span>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 py-1.5 mt-3 cursor-grab w-full sm:w-auto"
                      draggable="true"
                      onDragStart={(e) => {
                        if (e.dataTransfer.setData) {
                          e.dataTransfer.setData('DownloadURL', `${file.type}:${file.name}:${file.url}`);
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      {/* TODO: Add a "Download All as ZIP" button here later */}
    </div>
  );
}
