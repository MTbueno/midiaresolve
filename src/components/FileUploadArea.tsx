
"use client";
import { useState, useCallback, useRef } from 'react';
import type React from 'react';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadAreaProps {
  onFileSelect: (files: FileList) => void; // Changed to FileList for multiple files
  acceptedFileTypes?: string[]; 
}

export function FileUploadArea({ onFileSelect, acceptedFileTypes = ['image/*'] }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesValidation = useCallback((files: FileList): boolean => {
    if (files.length === 0) return false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!acceptedFileTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -2));
        }
        return file.type === type;
      })) {
        toast({
          title: "Unsupported File Type",
          description: `File "${file.name}" is not supported. Please upload only images. Supported types: ${acceptedFileTypes.join(', ')}.`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  }, [acceptedFileTypes, toast]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) { // Check if leaving to a child element
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
    e.dataTransfer.dropEffect = 'copy';
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (handleFilesValidation(e.dataTransfer.files)) {
        onFileSelect(e.dataTransfer.files);
      }
      e.dataTransfer.clearData();
    }
  }, [onFileSelect, handleFilesValidation]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handleFilesValidation(e.target.files)) {
        onFileSelect(e.target.files);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  }, [onFileSelect, handleFilesValidation]);

  const handleDivClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []); 

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70 hover:bg-muted/50"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleDivClick}
      role="button"
      tabIndex={0}
      aria-label="File upload area"
      onKeyDown={(e) => { 
        if (e.key === 'Enter' || e.key === ' ') {
          handleDivClick();
        }
      }}
    >
      <UploadCloud className={cn("w-12 h-12 mb-3 pointer-events-none", isDragging ? "text-primary" : "text-muted-foreground")} />
      <p className={cn("mb-1 text-sm font-semibold pointer-events-none", isDragging ? "text-primary" : "text-foreground")}>
        Drag & drop images here
      </p>
      <p className="text-xs text-muted-foreground pointer-events-none">or click to select images</p>
      <input
        ref={fileInputRef}
        id="fileInput"
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={acceptedFileTypes.join(',')}
        aria-hidden="true" 
        multiple // Allow multiple file selection
      />
      <p className="mt-2 text-xs text-muted-foreground pointer-events-none">Supports: Images (JPG, PNG, WEBP, etc.)</p>
    </div>
  );
}
