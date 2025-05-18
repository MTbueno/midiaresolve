
"use client";
import { useState, useEffect, useCallback } from 'react';
import piexif from 'piexifjs';
import { AppHeader } from '@/components/AppHeader';
import { FileUploadArea } from '@/components/FileUploadArea';
import { CompressionOptions, type CompressionLevel } from '@/components/CompressionOptions';
import { FilePreview } from '@/components/FilePreview';
import { ProcessedFileDisplay, type ProcessedResult } from '@/components/ProcessedFileDisplay';
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

interface FileToProcess {
  id: string;
  originalFile: File;
  originalDimensions: OriginalDimensions | null;
  exifData: string | null; // Store as base64 string
}

export default function MidiaResolvePage() {
  const [filesToProcess, setFilesToProcess] = useState<FileToProcess[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [scalePercentage, setScalePercentage] = useState<number>(100);
  const [outputWidth, setOutputWidth] = useState<string>('');
  const [outputHeight, setOutputHeight] = useState<string>('');
  const [isCropping, setIsCropping] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      processedResults.forEach(result => {
        if (result.url) URL.revokeObjectURL(result.url);
      });
    };
  }, [processedResults]);

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    setIsProcessing(true);
    const newFilesToProcess: FileToProcess[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('image/')) {
        toast({ title: "Unsupported File", description: `"${file.name}" is not an image and will be skipped.`, variant: "destructive" });
        continue;
      }

      const id = `${file.name}-${file.lastModified}-${file.size}`;
      let dimensions: OriginalDimensions | null = null;
      let exifStr: string | null = null;

      try {
        // Read EXIF data first
        const fileBuffer = await file.arrayBuffer();
        const dataUrl = `data:${file.type};base64,${Buffer.from(fileBuffer).toString('base64')}`;
        try {
          // piexif.load might throw error for non-JPEG or no EXIF
           piexif.load(dataUrl); // Check if it's valid
           exifStr = dataUrl; // Store the original dataURL containing EXIF if loadable
        } catch (exifError) {
          console.warn(`Could not load EXIF for ${file.name}:`, exifError);
          exifStr = null; // Ensure exifData is null if it can't be loaded
        }
        
        // Get dimensions
        dimensions = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = () => reject(new Error("Could not load image to get dimensions."));
          img.src = URL.createObjectURL(file); // Use object URL for dimensions to avoid base64 overhead
        });
        URL.revokeObjectURL(img.src); // Clean up object URL

      } catch (error) {
        console.error("Error processing file for preview:", error);
        toast({ title: "File Read Error", description: `Could not read metadata for "${file.name}".`, variant: "destructive" });
      }
      newFilesToProcess.push({ id, originalFile: file, originalDimensions: dimensions, exifData: exifStr });
    }
    
    setFilesToProcess(current => [...current, ...newFilesToProcess]);
    setProcessedResults([]);
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setIsProcessing(false);
  }, [toast]);

  useEffect(() => {
    if (filesToProcess.length > 0 && filesToProcess[0].originalDimensions && outputWidth && outputHeight) {
      const w = parseInt(outputWidth);
      const h = parseInt(outputHeight);
      const firstImageDims = filesToProcess[0].originalDimensions;

      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
        setIsCropping(false);
        return;
      }
      const originalAspectRatio = firstImageDims.width / firstImageDims.height;
      const targetAspectRatio = w / h;

      setIsCropping(Math.abs(originalAspectRatio - targetAspectRatio) > 0.001);
    } else {
      setIsCropping(false);
    }
  }, [outputWidth, outputHeight, filesToProcess]);

  const clearFiles = useCallback(() => {
    setFilesToProcess([]);
    setProcessedResults([]);
    // Reset advanced options
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
  }, []);

  const handleCompress = async () => {
    if (filesToProcess.length === 0) {
      toast({ title: "No files selected", description: "Please select image files to compress.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    processedResults.forEach(r => URL.revokeObjectURL(r.url)); // Clean up previous results
    setProcessedResults([]);
    
    const newProcessedResults: ProcessedResult[] = [];

    for (const fileToProcess of filesToProcess) {
      const { originalFile, originalDimensions, exifData, id } = fileToProcess;
      
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for UI responsiveness

      let newFileBlob: Blob = originalFile;
      let finalNewSize = originalFile.size;
      let processedFileName = `compressed_${originalFile.name}`;
      const currentFileType = originalFile.type;
      let wasExifPreserved = false;

      if (currentFileType.startsWith('image/') && originalDimensions) {
        try {
          newFileBlob = await new Promise((resolveBlob, rejectBlob) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                rejectBlob(new Error('Failed to get canvas context'));
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
              
              targetWidth = Math.max(1, targetWidth);
              targetHeight = Math.max(1, targetHeight);

              canvas.width = targetWidth;
              canvas.height = targetHeight;

              if (performCrop) {
                const sourceAspectRatio = originalDimensions.width / originalDimensions.height;
                const targetCanvasAspectRatio = targetWidth / targetHeight;
                let sx = 0, sy = 0, sWidth = originalDimensions.width, sHeight = originalDimensions.height;

                if (sourceAspectRatio > targetCanvasAspectRatio) {
                  sWidth = originalDimensions.height * targetCanvasAspectRatio;
                  sx = (originalDimensions.width - sWidth) / 2;
                } else if (sourceAspectRatio < targetCanvasAspectRatio) {
                  sHeight = originalDimensions.width / targetCanvasAspectRatio;
                  sy = (originalDimensions.height - sHeight) / 2;
                }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
              } else {
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              }

              let quality = 0.7; 
              if (compressionLevel === 'low') quality = 0.9;
              if (compressionLevel === 'high') quality = 0.5;
              
              let targetMimeType = 'image/jpeg'; // Default to JPEG for compression & EXIF
              if (currentFileType === 'image/png' && compressionLevel === 'low' && !performCrop && scalePercentage === 100 && !outputWidth && !outputHeight) {
                targetMimeType = 'image/png'; // Preserve PNG if low compression and no geometric changes
              }
              
              let canvasDataUrl = canvas.toDataURL(targetMimeType, targetMimeType === 'image/jpeg' ? quality : undefined);

              if (targetMimeType === 'image/jpeg' && exifData) {
                try {
                  const existingExif = piexif.load(exifData); // Load from original base64
                  const newExifDump = piexif.dump(existingExif);
                  canvasDataUrl = piexif.insert(newExifDump, canvasDataUrl);
                  wasExifPreserved = true;
                } catch (exifError) {
                  console.warn(`Failed to insert EXIF for ${originalFile.name}:`, exifError);
                }
              }
              
              // Convert final dataURL to Blob
              const byteString = atob(canvasDataUrl.split(',')[1]);
              const finalMimeString = canvasDataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolveBlob(new Blob([ab], { type: finalMimeString }));
            };
            img.onerror = (e) => rejectBlob(new Error(`Image loading failed: ${e instanceof Event ? 'network error' : e.toString()}`));
            
            // Use original file for image processing to ensure metadata is available if exifData was correctly read
            const reader = new FileReader();
            reader.onload = (event) => {
              if (!event.target?.result) {
                rejectBlob(new Error("Failed to read file for image processing"));
                return;
              }
              img.src = event.target.result as string;
            };
            reader.onerror = (e) => rejectBlob(new Error(`FileReader failed for image processing.`));
            reader.readAsDataURL(originalFile);
          });

          finalNewSize = newFileBlob.size;
          
          if (newFileBlob.type !== currentFileType || !processedFileName.endsWith(newFileBlob.type.split('/')[1])) {
              const dotIndex = originalFile.name.lastIndexOf('.');
              const baseName = dotIndex > -1 ? originalFile.name.substring(0, dotIndex) : originalFile.name;
              const newExtension = newFileBlob.type.split('/')[1];
              processedFileName = `compressed_${baseName}.${newExtension || 'bin'}`;
          }

        } catch (error: any) {
          console.error(`Image processing error for ${originalFile.name}:`, error);
          newProcessedResults.push({
            id, name: originalFile.name, url: '', originalSize: originalFile.size, newSize: originalFile.size, type: originalFile.type, error: error.message || "Processing failed"
          });
          continue; // Skip to next file
        }
      } else {
         newProcessedResults.push({
            id, name: originalFile.name, url: '', originalSize: originalFile.size, newSize: originalFile.size, type: originalFile.type, error: "Not an image or no dimensions"
          });
        continue; // Skip to next file
      }

      const objectURL = URL.createObjectURL(newFileBlob);
      newProcessedResults.push({
        id,
        name: processedFileName,
        url: objectURL,
        originalSize: originalFile.size,
        newSize: finalNewSize,
        type: newFileBlob.type,
      });
      
      let toastMessage = `${processedFileName} ready.`;
      if (wasExifPreserved) {
        toastMessage += " EXIF preserved (JPEG)."
      } else if (newFileBlob.type === 'image/jpeg' && exifData) {
        toastMessage += " EXIF not preserved."
      }


      toast({ title: "Image Processed", description: toastMessage, duration: 2000 });
    }

    setProcessedResults(newProcessedResults);
    setIsProcessing(false);
    if (newProcessedResults.some(r => !r.error)) {
        toast({ title: "Batch Processing Complete!", description: `All images processed. Check results below.` });
    } else if (newProcessedResults.length > 0) {
        toast({ title: "Batch Processing Finished", description: `Some images could not be processed. See details below.`, variant: "destructive" });
    }
  };

  const handleReset = () => {
    clearFiles();
    setIsProcessing(false);
    setCompressionLevel('medium');
  };
  
  const firstOriginalDimensions = filesToProcess.length > 0 && filesToProcess[0].originalDimensions 
    ? filesToProcess[0].originalDimensions 
    : null;


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-card">
      <AppHeader />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-lg bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-2xl rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Image Compressor</CardTitle>
            <CardDescription>Upload, compress, and download your images.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">
            {filesToProcess.length === 0 && !isProcessing && (
              <FileUploadArea onFileSelect={handleFileSelect} acceptedFileTypes={['image/*']} />
            )}
            {isProcessing && filesToProcess.length === 0 && <LoadingSpinner className="mx-auto" size={32} />}


            {filesToProcess.length > 0 && processedResults.length === 0 && (
              <>
                <FilePreview files={filesToProcess.map(f => f.originalFile)} onClear={clearFiles} />
                <CompressionOptions value={compressionLevel} onChange={setCompressionLevel} />
                
                {firstOriginalDimensions && (
                  <ImageAdvancedOptions
                    scalePercentage={scalePercentage}
                    onScalePercentageChange={setScalePercentage}
                    outputWidth={outputWidth}
                    onOutputWidthChange={setOutputWidth}
                    outputHeight={outputHeight}
                    onOutputHeightChange={setOutputHeight}
                    isCropping={isCropping}
                    originalDimensions={firstOriginalDimensions}
                    isBatch={filesToProcess.length > 1}
                  />
                )}

                <Button onClick={handleCompress} disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <LoadingSpinner className="mr-2" size={16} />
                  ) : null}
                  {isProcessing ? 'Processing...' : `Process ${filesToProcess.length} Image(s)`}
                </Button>
              </>
            )}
            
            {processedResults.length > 0 && (
              <div className="text-center">
                <ProcessedFileDisplay processedFiles={processedResults} />
                <Button onClick={handleReset} variant="outline" className="w-full mt-4">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Process More Images
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
