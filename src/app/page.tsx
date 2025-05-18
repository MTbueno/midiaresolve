
"use client";
import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { FileUploadArea } from '@/components/FileUploadArea';
import { CompressionOptions, type CompressionLevel } from '@/components/CompressionOptions';
import { FilePreview } from '@/components/FilePreview';
import { ProcessedFileDisplay, type ProcessedFile } from '@/components/ProcessedFileDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ImageAdvancedOptions } from '@/components/ImageAdvancedOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw } from 'lucide-react';

export interface OriginalDimensions {
  width: number;
  height: number;
}

export default function MidiaResolvePage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<OriginalDimensions | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Advanced options state
  const [scalePercentage, setScalePercentage] = useState<number>(100);
  const [outputWidth, setOutputWidth] = useState<string>('');
  const [outputHeight, setOutputHeight] = useState<string>('');
  const [isCropping, setIsCropping] = useState<boolean>(false);


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
    setScalePercentage(100); // Reset advanced options
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setOriginalDimensions(null);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height });
        };
        if (e.target?.result) {
            img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  // Effect to determine if cropping will occur based on manual inputs
  useEffect(() => {
    if (file?.type.startsWith('image/') && originalDimensions && outputWidth && outputHeight) {
      const w = parseInt(outputWidth);
      const h = parseInt(outputHeight);

      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
        setIsCropping(false);
        return;
      }
      const originalAspectRatio = originalDimensions.width / originalDimensions.height;
      const targetAspectRatio = w / h;

      if (Math.abs(originalAspectRatio - targetAspectRatio) > 0.001) { // Using a small epsilon
        setIsCropping(true);
      } else {
        setIsCropping(false);
      }
    } else {
      setIsCropping(false);
    }
  }, [outputWidth, outputHeight, originalDimensions, file]);


  const clearFile = useCallback(() => {
    setFile(null);
    setProcessedFile(null);
    setOriginalDimensions(null);
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
  }, []);

  const handleCompress = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to compress.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    if (processedFile?.url) URL.revokeObjectURL(processedFile.url);
    setProcessedFile(null);

    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Simulate base delay

    let newFileBlob: Blob = file;
    let finalNewSize = file.size;
    let processedFileName = `compressed_${file.name}`;
    const currentFileType = file.type;


    if (currentFileType.startsWith('image/') && originalDimensions) {
      try {
        newFileBlob = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            let targetWidth = originalDimensions.width;
            let targetHeight = originalDimensions.height;
            let performCrop = false;

            const manualW = parseInt(outputWidth);
            const manualH = parseInt(outputHeight);

            if (!isNaN(manualW) && manualW > 0 && !isNaN(manualH) && manualH > 0) {
              targetWidth = manualW;
              targetHeight = manualH;
              const originalAspectRatio = originalDimensions.width / originalDimensions.height;
              const manualAspectRatio = manualW / manualH;
              if (Math.abs(originalAspectRatio - manualAspectRatio) > 0.001) {
                performCrop = true;
              }
            } else if (scalePercentage !== 100) {
              targetWidth = Math.round(originalDimensions.width * (scalePercentage / 100));
              targetHeight = Math.round(originalDimensions.height * (scalePercentage / 100));
            }
            
            // Ensure minimum dimensions
            targetWidth = Math.max(1, targetWidth);
            targetHeight = Math.max(1, targetHeight);

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            if (performCrop) {
              // Crop from center
              const sourceAspectRatio = originalDimensions.width / originalDimensions.height;
              const targetCanvasAspectRatio = targetWidth / targetHeight;
              let sx = 0, sy = 0, sWidth = originalDimensions.width, sHeight = originalDimensions.height;

              if (sourceAspectRatio > targetCanvasAspectRatio) { // Original is wider than target canvas
                sWidth = originalDimensions.height * targetCanvasAspectRatio;
                sx = (originalDimensions.width - sWidth) / 2;
              } else if (sourceAspectRatio < targetCanvasAspectRatio) { // Original is taller than target canvas
                sHeight = originalDimensions.width / targetCanvasAspectRatio;
                sy = (originalDimensions.height - sHeight) / 2;
              }
              ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            } else {
              // Simple resize
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            }

            let quality = 0.7; // Medium
            if (compressionLevel === 'low') quality = 0.9;
            if (compressionLevel === 'high') quality = 0.5;
            
            let targetMimeType = 'image/jpeg';
             if (currentFileType === 'image/png' && compressionLevel === 'low' && !performCrop && scalePercentage === 100 && !outputWidth && !outputHeight) {
              // Try to preserve PNG if low compression and no resize/crop
              targetMimeType = 'image/png';
            }


            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob conversion failed'));
              },
              targetMimeType,
              targetMimeType === 'image/jpeg' ? quality : undefined
            );
          };
          img.onerror = (e) => reject(new Error(`Image loading failed: ${e instanceof Event ? 'network error' : e.toString()}`));
          
          const reader = new FileReader();
          reader.onload = (event) => {
            if (!event.target?.result) {
                reject(new Error("Failed to read file for image processing"));
                return;
            }
            img.src = event.target.result as string;
          };
          reader.onerror = (e) => reject(new Error(`FileReader failed for image processing: ${e instanceof ProgressEvent ? 'read error' : e.toString()}`));
          reader.readAsDataURL(file);
        });

        finalNewSize = newFileBlob.size;
        
        if (newFileBlob.type !== currentFileType) {
            const baseName = file.name.substring(0, file.name.lastIndexOf('.') > 0 ? file.name.lastIndexOf('.') : file.name.length);
            const newExtension = newFileBlob.type.split('/')[1];
            processedFileName = `compressed_${baseName}.${newExtension || 'bin'}`;
        }

      } catch (error: any) {
        console.error("Image processing error:", error);
        toast({ title: "Image Processing Error", description: error.message || "Could not process the image. Using original.", variant: "destructive" });
        newFileBlob = file; // Fallback
        finalNewSize = file.size;
        processedFileName = `compressed_${file.name}`;
      }
    } else if (currentFileType.startsWith('video/')) {
      // Simulate video compression (size reduction is just an estimate)
      let reductionFactor = 0.5; // Medium default
      if (compressionLevel === 'low') reductionFactor = 0.75;
      if (compressionLevel === 'high') reductionFactor = 0.25;
      finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor));
      toast({ title: "Video File Processing", description: "Video compression is simulated. The downloaded file will be the original.", variant: "default" });
    } else {
      // Simulate other file types compression
       let reductionFactor = 0.8; // Default less aggressive for other types
      if (compressionLevel === 'low') reductionFactor = 0.9;
      if (compressionLevel === 'high') reductionFactor = 0.6;
      finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor));
      toast({ title: "File Processing", description: "Compression for this file type is simulated. Download will be the original file.", variant: "default" });
    }

    const objectURL = URL.createObjectURL(newFileBlob);
    setProcessedFile({
      name: processedFileName,
      url: objectURL,
      originalSize: file.size,
      newSize: finalNewSize,
      type: newFileBlob.type
    });
    setIsProcessing(false);
    toast({ title: "Compression Complete!", description: `${processedFileName} has been processed.` });
  };

  const handleReset = () => {
    setFile(null);
    setProcessedFile(null);
    setIsProcessing(false);
    setCompressionLevel('medium');
    setOriginalDimensions(null);
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
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
                {file.type.startsWith('image/') && originalDimensions && (
                  <ImageAdvancedOptions
                    scalePercentage={scalePercentage}
                    onScalePercentageChange={setScalePercentage}
                    outputWidth={outputWidth}
                    onOutputWidthChange={setOutputWidth}
                    outputHeight={outputHeight}
                    onOutputHeightChange={setOutputHeight}
                    isCropping={isCropping}
                    originalDimensions={originalDimensions}
                  />
                )}
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
