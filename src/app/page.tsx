
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
    if (processedFile?.url) URL.revokeObjectURL(processedFile.url); // Revoke old URL if exists
    setProcessedFile(null);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    let reductionFactor = 0.5; // Medium default
    if (compressionLevel === 'low') reductionFactor = 0.75; // Smaller reduction for low
    if (compressionLevel === 'high') reductionFactor = 0.25; // Larger reduction for high

    let newFileBlob: Blob = file; // Default to original file blob
    let finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor)); // Default simulated new size
    let processedFileName = `compressed_${file.name}`;


    if (file.type.startsWith('image/')) {
      try {
        newFileBlob = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (!event.target?.result) {
                reject(new Error("Failed to read file"));
                return;
            }
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              let targetMimeType = 'image/jpeg'; // Default to JPEG for compression
              let quality = 0.7; // Corresponds to medium compression quality

              if (compressionLevel === 'low') quality = 0.9;
              if (compressionLevel === 'high') quality = 0.5;

              // If original is PNG and compression is 'low', keep as PNG (less lossy)
              // Otherwise, convert to JPEG for better size reduction via quality setting.
              if (file.type === 'image/png' && compressionLevel === 'low') {
                targetMimeType = 'image/png';
              }
              
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Canvas toBlob conversion failed'));
                  }
                },
                targetMimeType,
                targetMimeType === 'image/jpeg' ? quality : undefined // Quality parameter only applies to image/jpeg or image/webp
              );
            };
            img.onerror = (e) => reject(new Error(`Image loading failed: ${e instanceof Event ? 'network error' : e.toString()}`));
            img.src = event.target.result as string;
          };
          reader.onerror = (e) => reject(new Error(`FileReader failed: ${e instanceof ProgressEvent ? 'read error' : e.toString()}`));
          reader.readAsDataURL(file);
        });
        finalNewSize = newFileBlob.size; // Use the actual size of the new blob

        // Adjust filename if extension changed
        if (newFileBlob.type !== file.type) {
            const baseName = file.name.substring(0, file.name.lastIndexOf('.') > 0 ? file.name.lastIndexOf('.') : file.name.length);
            const newExtension = newFileBlob.type.split('/')[1];
            processedFileName = `compressed_${baseName}.${newExtension}`;
        }

      } catch (error: any) {
        console.error("Image processing error:", error);
        toast({ title: "Image Processing Error", description: error.message || "Could not process the image. Using original.", variant: "destructive" });
        newFileBlob = file; // Fallback to original file blob
        finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor)); // Fallback to simulated size
        processedFileName = `compressed_${file.name}`; // Fallback to original name
      }
    } else if (file.type.startsWith('video/')) {
      toast({ title: "Video File Processing", description: "Video compression is simulated. The downloaded file will be the original.", variant: "default" });
      // newFileBlob is already 'file', finalNewSize is the simulated one
    } else {
      toast({ title: "File Processing", description: "Compression for this file type is simulated. Download will be the original file.", variant: "default" });
      // newFileBlob is already 'file', finalNewSize is the simulated one
    }

    const objectURL = URL.createObjectURL(newFileBlob);

    setProcessedFile({
      name: processedFileName,
      url: objectURL,
      originalSize: file.size,
      newSize: finalNewSize,
      type: newFileBlob.type // Use the type of the (potentially) new blob
    });
    setIsProcessing(false);
    toast({ title: "Compression Complete!", description: `${processedFileName} has been processed.` });
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
