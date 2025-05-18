"use client";
import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { FileUploadArea } from '@/components/FileUploadArea';
import { CompressionOptions, type CompressionLevel } from '@/components/CompressionOptions';
import { FilePreview } from '@/components/FilePreview';
import { ProcessedFileDisplay, type ProcessedFile } from '@/components/ProcessedFileDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw } from 'lucide-react';

export default function MidiaResolvePage() {
  const [file, setFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (processedFile?.url) {
        URL.revokeObjectURL(processedFile.url);
      }
    };
  }, [processedFile]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setProcessedFile(null); // Clear previous processed file
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setProcessedFile(null);
  }, []);

  const handleCompress = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to compress.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    if(processedFile?.url) URL.revokeObjectURL(processedFile.url); // Revoke old URL if exists
    setProcessedFile(null);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    let reductionFactor = 0.5; // Medium
    if (compressionLevel === 'low') reductionFactor = 0.75; // Smaller reduction
    if (compressionLevel === 'high') reductionFactor = 0.25; // Larger reduction

    const newSize = Math.max(1024, Math.floor(file.size * reductionFactor));

    // Create a blob URL for the "processed" file. In a real app, this would be the compressed blob.
    // For simulation, we use the original file's blob.
    const objectURL = URL.createObjectURL(file);

    setProcessedFile({
      name: `compressed_${file.name}`,
      url: objectURL,
      originalSize: file.size,
      newSize: newSize,
      type: file.type
    });
    setIsProcessing(false);
    toast({ title: "Compression Complete!", description: `${file.name} has been processed.` });
  };

  const handleReset = () => {
    setFile(null);
    setProcessedFile(null);
    setIsProcessing(false);
    setCompressionLevel('medium');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-card">
      <AppHeader />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-lg bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-2xl rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Media Compressor</CardTitle>
            <CardDescription>Upload, compress, and download your images and videos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">
            {!file && (
              <FileUploadArea onFileSelect={handleFileSelect} acceptedFileTypes={['image/*', 'video/*']} />
            )}

            {file && !processedFile && (
              <>
                <FilePreview file={file} onClear={clearFile} />
                <CompressionOptions value={compressionLevel} onChange={setCompressionLevel} />
                <Button onClick={handleCompress} disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <LoadingSpinner className="mr-2" size={16} />
                  ) : null}
                  {isProcessing ? 'Compressing...' : 'Compress File'}
                </Button>
              </>
            )}
            
            {processedFile && (
              <div className="text-center">
                <ProcessedFileDisplay processedFile={processedFile} />
                <Button onClick={handleReset} variant="outline" className="w-full mt-4">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Process Another File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
