
"use client";
import { FileImage, XCircle, Info } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface FilePreviewProps {
  files: File[];
  onClear?: () => void;
}

export function FilePreview({ files, onClear }: FilePreviewProps) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="my-6 p-4 border border-border rounded-lg bg-muted/30 shadow-sm relative">
      {onClear && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="absolute top-2 right-2 h-7 w-7 z-10"
          aria-label="Clear all files"
        >
          <XCircle className="w-5 h-5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
      <div className="flex items-center mb-3">
        <Info className="w-5 h-5 text-primary mr-2" />
        <h3 className="text-md font-semibold">Selected Files ({files.length})</h3>
      </div>
      <ScrollArea className="h-40 w-full">
        <ul className="space-y-2 pr-3">
          {files.map((file, index) => (
            <li key={index} className="flex items-center space-x-3 p-2 rounded-md border border-border/50 bg-background/50">
              <FileImage className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="flex-grow overflow-hidden">
                <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.type} - {formatFileSize(file.size)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
       {files.length > 1 && (
        <Badge variant="outline" className="mt-3">
          Advanced options will apply to all images based on the first image's dimensions.
        </Badge>
      )}
    </div>
  );
}
