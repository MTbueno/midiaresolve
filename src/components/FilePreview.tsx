
"use client";
import { FileImage, File as FileIcon, XCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
  file: File;
  onClear?: () => void;
}

export function FilePreview({ file, onClear }: FilePreviewProps) {
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return <FileImage className="w-10 h-10 text-primary" />;
    // Fallback, though ideally only images will reach here
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
        </div>
      </div>
    </div>
  );
}
