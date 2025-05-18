
"use client";
import { useState, useCallback, useRef } from 'react';
import type React from 'react';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string[]; // e.g., ['image/*']
}

export function FileUploadArea({ onFileSelect, acceptedFileTypes = ['image/*'] }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = useCallback((file: File): boolean => {
    if (!acceptedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return file.type === type;
    })) {
      toast({
        title: "Unsupported File Type",
        description: `Please upload an image file. Supported types: ${acceptedFileTypes.join(', ')}.`,
        variant: "destructive",
      });
      return false;
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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
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
      const file = e.dataTransfer.files[0];
      if (handleFileValidation(file)) {
        onFileSelect(file);
      }
      e.dataTransfer.clearData();
    }
  }, [onFileSelect, handleFileValidation]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (handleFileValidation(file)) {
        onFileSelect(file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect, handleFileValidation]);

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
        Drag & drop image here
      </p>
      <p className="text-xs text-muted-foreground pointer-events-none">or click to select an image</p>
      <input
        ref={fileInputRef}
        id="fileInput"
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={acceptedFileTypes.join(',')}
        aria-hidden="true" 
      />
      <p className="mt-2 text-xs text-muted-foreground pointer-events-none">Supports: Images (JPG, PNG, WEBP, etc.)</p>
    </div>
  );
}
