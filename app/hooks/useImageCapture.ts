import { useState, useRef, useEffect, useCallback } from "react";
import { normalizeImageDataUrl } from "~/services/db";

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const normalized = normalizeImageDataUrl(reader.result as string);
      if (normalized) {
        resolve(normalized);
      } else {
        reject(new Error("Failed to read image data."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes, downscales (max 1280px), and re-encodes an image Blob/File as a JPEG data URL.
 * This ensures large iPhone camera photos (12MP-48MP) and HEIC/HEIF images are converted
 * into compact, universally renderable JPEG data URLs with EXIF orientation applied.
 */
export async function processImageBlob(blob: Blob): Promise<string> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return readBlobAsDataUrl(blob);
  }

  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          readBlobAsDataUrl(blob).then(resolve).catch(reject);
          return;
        }

        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          readBlobAsDataUrl(blob).then(resolve).catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (
          dataUrl &&
          dataUrl.startsWith("data:image/") &&
          dataUrl !== "data:,"
        ) {
          resolve(dataUrl);
        } else {
          readBlobAsDataUrl(blob).then(resolve).catch(reject);
        }
      } catch {
        readBlobAsDataUrl(blob).then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      readBlobAsDataUrl(blob).then(resolve).catch(reject);
    };

    img.src = objectUrl;
  });
}

export function useImageCapture(initialImage: string | null = null) {
  const [capturedImage, setCapturedImage] = useState<string | null>(
    () => normalizeImageDataUrl(initialImage) ?? null
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [isCapturing]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleChooseFileClick = useCallback(() => {
    setImageError(null);
    let input = fileInputRef.current;
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      fileInputRef.current = input;
    }
    input.value = "";
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        try {
          const dataUrl = await processImageBlob(file);
          setCapturedImage(dataUrl);
          setImageError(null);
        } catch {
          setImageError("Failed to read image file.");
        }
      }
    };
    input.click();
  }, []);

  const handleCaptureImageClick = useCallback(async () => {
    setImageError(null);
    if (
      typeof window !== "undefined" &&
      "MediaStream" in window &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      try {
        setIsCapturing(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
      } catch (err: any) {
        console.error("Error using camera API:", err);
        setImageError(
          `Camera access denied or not available: ${err.message}. You can try choosing a file instead.`
        );
        setIsCapturing(false);
      }
    } else {
      handleChooseFileClick();
      setImageError("Live camera not supported. Please choose a file.");
    }
  }, [handleChooseFileClick]);

  const handleTakePhotoFromStream = useCallback(async () => {
    if (streamRef.current) {
      try {
        if (
          "ImageCapture" in window &&
          streamRef.current.getVideoTracks().length > 0
        ) {
          try {
            const imageCapture = new ImageCapture(
              streamRef.current.getVideoTracks()[0]
            );
            const blob = await imageCapture.takePhoto();
            const dataUrl = await processImageBlob(blob);
            setCapturedImage(dataUrl);
            setImageError(null);
            return;
          } catch (captureErr) {
            console.warn(
              "ImageCapture.takePhoto failed, falling back to video frame capture:",
              captureErr
            );
          }
        }

        const video = videoRef.current;
        if (video && (video.videoWidth > 0 || video.width > 0)) {
          let width = video.videoWidth || video.width;
          let height = video.videoHeight || video.height;
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width >= height) {
              height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
              height = MAX_IMAGE_DIMENSION;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Could not initialize canvas context.");
          }
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
          setCapturedImage(dataUrl);
          setImageError(null);
        } else {
          throw new Error("Failed to process captured image.");
        }
      } catch (err: any) {
        setImageError(`Could not take photo: ${err.message}`);
      } finally {
        stopStream();
        setIsCapturing(false);
      }
    }
  }, [stopStream]);

  const handleCancelCamera = useCallback(() => {
    stopStream();
    setIsCapturing(false);
    setImageError(null);
  }, [stopStream]);

  const handleRemoveImageClick = useCallback(() => {
    setCapturedImage(null);
    setImageError(null);
  }, []);

  return {
    capturedImage,
    setCapturedImage,
    imageError,
    isCapturing,
    videoRef,
    streamRef,
    handleCaptureImageClick,
    handleTakePhotoFromStream,
    handleCancelCamera,
    handleChooseFileClick,
    handleRemoveImageClick,
  };
}
