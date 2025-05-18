
"use client";
import { useState, useEffect, useCallback } from 'react';
import piexif from 'piexifjs';
import JSZip from 'jszip';
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
import { RefreshCcw, DownloadCloud } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";


export interface OriginalDimensions {
  width: number;
  height: number;
}

interface FileToProcess {
  id: string;
  originalFile: File;
  originalDimensions: OriginalDimensions | null;
  exifData: string | null; // Store as base64 string, as piexif needs a data URL
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
  const [overallProgress, setOverallProgress] = useState(0);


  useEffect(() => {
    return () => {
      processedResults.forEach(result => {
        if (result.url) URL.revokeObjectURL(result.url);
      });
    };
  }, [processedResults]);

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    setIsProcessing(true);
    setOverallProgress(0);
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
      let objectUrlForDimensions: string | null = null;

      try {
        const fileBuffer = await file.arrayBuffer();
        const base64String = Buffer.from(fileBuffer).toString('base64'); // Node.js Buffer might be polyfilled by bundler
        const dataUrlForExif = `data:${file.type};base64,${base64String}`;
        
        try {
           piexif.load(dataUrlForExif); 
           exifStr = dataUrlForExif; 
        } catch (exifError) {
          console.warn(`Could not load EXIF for ${file.name}:`, exifError);
          exifStr = null; 
        }
        
        objectUrlForDimensions = URL.createObjectURL(file);
        dimensions = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = (err) => reject(new Error(`Could not load image to get dimensions: ${err instanceof Event ? 'network error' : err.toString()}`));
          img.src = objectUrlForDimensions; 
        });

      } catch (error: any) {
        console.error("Error processing file for preview:", error);
        toast({ title: "File Read Error", description: `Could not read metadata for "${file.name}". Error: ${error.message}`, variant: "destructive" });
      } finally {
        if (objectUrlForDimensions) {
          URL.revokeObjectURL(objectUrlForDimensions); 
        }
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
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setOverallProgress(0);
  }, []);

  const handleCompress = async () => {
    if (filesToProcess.length === 0) {
      toast({ title: "No files selected", description: "Please select image files to compress.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setOverallProgress(0);
    processedResults.forEach(r => { if (r.url) URL.revokeObjectURL(r.url); }); 
    setProcessedResults([]);
    
    const newProcessedResults: ProcessedResult[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileToProcess = filesToProcess[i];
      const { originalFile, originalDimensions, exifData, id } = fileToProcess;
      
      // Removed per-file timeout, progress bar will show updates
      // await new Promise(resolve => setTimeout(resolve, 200));

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
              
              let targetMimeType = 'image/jpeg'; 
              if (currentFileType === 'image/png' && compressionLevel === 'low' && !performCrop && scalePercentage === 100 && !outputWidth && !outputHeight) {
                targetMimeType = 'image/png';
              }
              
              let canvasDataUrl = canvas.toDataURL(targetMimeType, targetMimeType === 'image/jpeg' ? quality : undefined);

              if (targetMimeType === 'image/jpeg' && exifData) {
                try {
                  const existingExif = piexif.load(exifData); 
                  delete existingExif['0th'][piexif.ImageIFD.Orientation];
                  delete existingExif['Exif'][piexif.ExifIFD.PixelXDimension];
                  delete existingExif['Exif'][piexif.ExifIFD.PixelYDimension];
                  const newExifDump = piexif.dump(existingExif);
                  canvasDataUrl = piexif.insert(newExifDump, canvasDataUrl);
                  wasExifPreserved = true;
                } catch (exifError) {
                  console.warn(`Failed to insert EXIF for ${originalFile.name}:`, exifError);
                }
              }
              
              const byteString = atob(canvasDataUrl.split(',')[1]);
              const finalMimeString = canvasDataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let k = 0; k < byteString.length; k++) {
                ia[k] = byteString.charCodeAt(k);
              }
              resolveBlob(new Blob([ab], { type: finalMimeString }));
            };
            img.onerror = (e) => rejectBlob(new Error(`Image loading failed for processing: ${e instanceof Event ? 'network error' : e.toString()}`));
            
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
          setOverallProgress(((i + 1) / filesToProcess.length) * 100);
          continue; 
        }
      } else {
         newProcessedResults.push({
            id, name: originalFile.name, url: '', originalSize: originalFile.size, newSize: originalFile.size, type: originalFile.type, error: "Not an image or no dimensions"
          });
        setOverallProgress(((i + 1) / filesToProcess.length) * 100);
        continue; 
      }

      const objectURL = URL.createObjectURL(newFileBlob);
      newProcessedResults.push({
        id,
        name: processedFileName,
        url: objectURL,
        originalSize: originalFile.size,
        newSize: finalNewSize,
        type: newFileBlob.type,
        wasExifPreserved: newFileBlob.type === 'image/jpeg' && exifData ? wasExifPreserved : undefined,
      });
      
      setOverallProgress(((i + 1) / filesToProcess.length) * 100);

      // Removed individual toast for batch processing
    }

    setProcessedResults(newProcessedResults);
    setIsProcessing(false);

    const successfulCount = newProcessedResults.filter(r => !r.error).length;
    const failedCount = newProcessedResults.length - successfulCount;

    if (filesToProcess.length > 1) { // Batch processing
        if (successfulCount === filesToProcess.length) {
            toast({ title: "Batch Processing Complete!", description: `${successfulCount} images processed successfully.` });
        } else if (successfulCount > 0) {
            toast({ title: "Batch Processing Finished", description: `${successfulCount} images processed successfully, ${failedCount} failed. Check results below.`});
        } else if (failedCount > 0) {
             toast({ title: "Batch Processing Failed", description: `All ${failedCount} images could not be processed. See details below.`, variant: "destructive" });
        }
    } else if (newProcessedResults.length === 1) { // Single file processing
        const result = newProcessedResults[0];
        if (!result.error) {
            let toastMessage = `${result.name} ready.`;
            if (result.wasExifPreserved) {
                toastMessage += " EXIF preserved (JPEG)."
            } else if (result.type === 'image/jpeg' && filesToProcess[0].exifData) {
                toastMessage += " EXIF not preserved."
            }
            toast({ title: "Image Processed", description: toastMessage });
        } else {
            toast({ title: "Processing Failed", description: result.error, variant: "destructive" });
        }
    }
  };

  const handleDownloadAll = async () => {
    if (processedResults.length === 0) return;
    const zip = new JSZip();
    let filesAddedToZip = 0;

    for (const result of processedResults) {
      if (result.url && !result.error) {
        try {
          const response = await fetch(result.url);
          const blob = await response.blob();
          zip.file(result.name, blob);
          filesAddedToZip++;
        } catch (error) {
          console.error(`Failed to fetch blob for ${result.name}:`, error);
          toast({
            title: "Download Error",
            description: `Could not include ${result.name} in the ZIP.`,
            variant: "destructive",
          });
        }
      }
    }

    if (filesAddedToZip === 0) {
        toast({
            title: "No Files to Zip",
            description: "No processed files were available to include in the ZIP.",
            variant: "destructive",
        });
        return;
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'MidiaResolve_Processed_Images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href); // Clean up the blob URL
      toast({ title: "Download Started", description: "Your ZIP file is being downloaded." });
    } catch (error) {
      console.error("Failed to generate ZIP:", error);
      toast({
        title: "ZIP Generation Error",
        description: "Could not create the ZIP file.",
        variant: "destructive",
      });
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
              <FileUploadArea onFileSelect={handleFileSelect} acceptedFileTypes={['image/*']} multiple />
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

                {isProcessing && filesToProcess.length > 1 && (
                  <div className="w-full space-y-2 my-4">
                    <Label htmlFor="batch-progress" className="text-sm font-medium text-center block">Processing Batch...</Label>
                    <Progress id="batch-progress" value={overallProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground text-center">{Math.round(overallProgress)}% complete</p>
                  </div>
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
                 {processedResults.length > 1 && processedResults.some(r => !r.error) && (
                  <Button onClick={handleDownloadAll} variant="secondary" className="w-full mt-4">
                    <DownloadCloud className="mr-2 h-4 w-4" /> Download All as ZIP
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline" className="w-full mt-2">
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

