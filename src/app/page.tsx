
"use client";
import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { FileUploadArea } from '@/components/FileUploadArea';
import { CompressionOptions, type CompressionLevel } from '@/components/CompressionOptions';
import { FilePreview } from '@/components/FilePreview';
import { ProcessedFileDisplay, type ProcessedFile } from '@/components/ProcessedFileDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ImageAdvancedOptions } from '@/components/ImageAdvancedOptions';
import { VideoAdvancedOptions, type VideoResolution } from '@/components/VideoAdvancedOptions'; // Added
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw } from 'lucide-react';
import { getResolutionLabel, type ResolutionOption } from '@/lib/videoUtils'; // Added

export interface OriginalDimensions {
  width: number;
  height: number;
}

export interface VideoInfo extends OriginalDimensions {
  label: string;
}

export default function MidiaResolvePage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<OriginalDimensions | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null); // Added for video
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Image Advanced options state
  const [scalePercentage, setScalePercentage] = useState<number>(100);
  const [outputWidth, setOutputWidth] = useState<string>('');
  const [outputHeight, setOutputHeight] = useState<string>('');
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // Video Advanced options state
  const [targetResolution, setTargetResolution] = useState<VideoResolution>('original'); // Added

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (processedFile?.url) {
        URL.revokeObjectURL(processedFile.url);
      }
      if (videoInfo && file?.type.startsWith('video/')) { // Clean up video src if any
        // The video src URL created in handleFileSelect might need cleanup if component unmounts before onloadedmetadata
      }
    };
  }, [processedFile, videoInfo, file]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setProcessedFile(null); // Clear previous processed file
    
    // Reset image options
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setOriginalDimensions(null);
    
    // Reset video options
    setVideoInfo(null);
    setTargetResolution('original');

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
    } else if (selectedFile.type.startsWith('video/')) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      const videoSrc = URL.createObjectURL(selectedFile);
      videoElement.src = videoSrc;

      videoElement.onloadedmetadata = () => {
        setVideoInfo({
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          label: getResolutionLabel(videoElement.videoWidth, videoElement.videoHeight),
        });
        URL.revokeObjectURL(videoSrc); // Clean up object URL once metadata is loaded
      };
      videoElement.onerror = () => {
        toast({ title: "Error", description: "Could not read video metadata.", variant: "destructive" });
        setVideoInfo(null);
        URL.revokeObjectURL(videoSrc); // Clean up also on error
      };
    }
  }, [toast]);

  // Effect to determine if image cropping will occur
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

      if (Math.abs(originalAspectRatio - targetAspectRatio) > 0.001) {
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
    setVideoInfo(null);
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setTargetResolution('original');
  }, []);

  const handleCompress = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to compress.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    if (processedFile?.url) URL.revokeObjectURL(processedFile.url);
    setProcessedFile(null);

    // Simulate base delay
    const processingMessage = file.type.startsWith('video/') ? 'Simulating video processing...' : 'Compressing...';
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 

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

            let quality = 0.7; // Medium
            if (compressionLevel === 'low') quality = 0.9;
            if (compressionLevel === 'high') quality = 0.5;
            
            let targetMimeType = 'image/jpeg';
             if (currentFileType === 'image/png' && compressionLevel === 'low' && !performCrop && scalePercentage === 100 && !outputWidth && !outputHeight) {
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
            const dotIndex = file.name.lastIndexOf('.');
            const baseName = dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name;
            const newExtension = newFileBlob.type.split('/')[1];
            processedFileName = `compressed_${baseName}.${newExtension || 'bin'}`;
        }

      } catch (error: any) {
        console.error("Image processing error:", error);
        toast({ title: "Image Processing Error", description: error.message || "Could not process the image. Using original.", variant: "destructive" });
        newFileBlob = file; 
        finalNewSize = file.size;
        processedFileName = `compressed_${file.name}`;
      }
    } else if (currentFileType.startsWith('video/') && videoInfo) {
      let reductionFactor = 0.5; // Medium default
      if (compressionLevel === 'low') reductionFactor = 0.75;
      if (compressionLevel === 'high') reductionFactor = 0.25;

      let targetResLabel = 'original';
      if (targetResolution !== 'original' && videoInfo) {
          const resolutionMap: Record<VideoResolution, ResolutionOption | undefined> = {
            original: undefined,
            '240p': { value: '240p', label: 'Low 240p', width: 426, height: 240 },
            '360p': { value: '360p', label: 'SD 360p', width: 640, height: 360 },
            '480p': { value: '480p', label: 'SD 480p', width: 854, height: 480 },
            hd: { value: 'hd', label: 'HD 720p', width: 1280, height: 720 },
            fullhd: { value: 'fullhd', label: 'FullHD 1080p', width: 1920, height: 1080 },
            '2k': { value: '2k', label: '2K QHD 1440p', width: 2560, height: 1440 },
            '4k': { value: '4k', label: '4K UHD 2160p', width: 3840, height: 2160 },
          };
          const selectedOpt = resolutionMap[targetResolution];
          if (selectedOpt && selectedOpt.width && selectedOpt.height) {
            targetResLabel = selectedOpt.value; // e.g. "hd", "240p"
            const originalPixelCount = videoInfo.width * videoInfo.height;
            const targetPixelCount = selectedOpt.width * selectedOpt.height;
            if (targetPixelCount < originalPixelCount) {
                reductionFactor *= (targetPixelCount / originalPixelCount) * 0.8 + 0.2; 
            } else if (targetPixelCount > originalPixelCount) {
                // If somehow upscaling was selected (should be prevented by UI), slightly increase factor
                reductionFactor *= (targetPixelCount / originalPixelCount) * 0.2 + 0.8;
            }
          }
      }
      
      finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor));
      
      const dotIndex = file.name.lastIndexOf('.');
      const baseName = dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name;
      const extension = dotIndex > -1 ? file.name.substring(dotIndex) : ''; // Corrected extension extraction
      
      processedFileName = `compressed_${baseName}${targetResLabel !== 'original' ? '_' + targetResLabel : ''}${extension}`;
      
      toast({ 
        title: "Video File Processing", 
        description: `Video 'conversion' to ${targetResLabel === 'original' ? 'original resolution' : targetResLabel.toUpperCase()} is simulated. The downloaded file contains the original video content but is renamed to "${processedFileName}". Actual video transcoding is a complex process.`, 
        variant: "default",
        duration: 8000, // Make toast last longer
      });
      newFileBlob = file; // Download original blob content
    } else {
       let reductionFactor = 0.8; 
      if (compressionLevel === 'low') reductionFactor = 0.9;
      if (compressionLevel === 'high') reductionFactor = 0.6;
      finalNewSize = Math.max(1024, Math.floor(file.size * reductionFactor));
      toast({ title: "File Processing", description: "Compression for this file type is simulated. Download will be the original file, potentially renamed.", variant: "default" });
      newFileBlob = file; // Download original blob
    }

    const objectURL = URL.createObjectURL(newFileBlob);
    setProcessedFile({
      name: processedFileName,
      url: objectURL,
      originalSize: file.size,
      newSize: finalNewSize,
      type: newFileBlob.type, 
    });
    setIsProcessing(false);
    toast({ title: "Processing Complete!", description: `${processedFileName} is ready for download.` });
  };

  const handleReset = () => {
    setFile(null);
    setProcessedFile(null);
    setIsProcessing(false);
    setCompressionLevel('medium');
    setOriginalDimensions(null);
    setVideoInfo(null);
    setScalePercentage(100);
    setOutputWidth('');
    setOutputHeight('');
    setIsCropping(false);
    setTargetResolution('original');
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
                <FilePreview file={file} onClear={clearFile} videoInfo={videoInfo} />
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

                {file.type.startsWith('video/') && videoInfo && (
                  <VideoAdvancedOptions
                    videoInfo={videoInfo}
                    targetResolution={targetResolution}
                    onTargetResolutionChange={setTargetResolution}
                  />
                )}

                <Button onClick={handleCompress} disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <LoadingSpinner className="mr-2" size={16} />
                  ) : null}
                  {isProcessing ? (file.type.startsWith('video/') ? 'Simulating video processing...' : 'Compressing...') : 'Process File'}
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
