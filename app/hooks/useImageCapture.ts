import { useState, useRef } from "react";

export function useImageCapture(initialImage: string | null = null) {
  const [capturedImage, setCapturedImage] = useState<string | null>(
    initialImage
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleCaptureImageClick = async () => {
    setImageError(null);
    if (
      "MediaStream" in window &&
      "ImageCapture" in window &&
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
        }
      } catch (err: any) {
        console.error("Error using ImageCapture API:", err);
        setImageError(
          `Camera access denied or not available: ${err.message}. You can try choosing a file instead.`
        );
        setIsCapturing(false);
      }
    } else {
      handleChooseFileClick();
      setImageError("Live camera not supported. Please choose a file.");
    }
  };

  const handleTakePhotoFromStream = async () => {
    if (streamRef.current) {
      try {
        const imageCapture = new ImageCapture(
          streamRef.current.getVideoTracks()[0]
        );
        const blob = await imageCapture.takePhoto();
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
          setImageError(null);
        };
        reader.onerror = () => {
          setImageError("Failed to process captured image.");
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        setImageError(`Could not take photo: ${err.message}`);
      } finally {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsCapturing(false);
      }
    }
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setImageError(null);
  };

  const handleChooseFileClick = () => {
    setImageError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
        };
        reader.onerror = () => {
          setImageError("Failed to read image file.");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemoveImageClick = () => {
    setCapturedImage(null);
    setImageError(null);
  };

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
