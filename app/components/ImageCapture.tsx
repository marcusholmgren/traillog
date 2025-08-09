import {
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./button";

interface ImageCaptureProps {
  capturedImage: string | null;
  imageError: string | null;
  isCapturing: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  handleCaptureImageClick: () => void;
  handleChooseFileClick: () => void;
  handleRemoveImageClick: () => void;
  handleTakePhotoFromStream: () => void;
  handleCancelCamera: () => void;
}

export function ImageCapture({
  capturedImage,
  imageError,
  isCapturing,
  videoRef,
  handleCaptureImageClick,
  handleChooseFileClick,
  handleRemoveImageClick,
  handleTakePhotoFromStream,
  handleCancelCamera,
}: ImageCaptureProps) {
  return (
    <div className="space-y-2">
      <h3>Photo</h3>
      {isCapturing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-md aspect-[4/3] rounded-lg"
          />
          <div className="flex gap-4 mt-4">
            <Button type="button" onClick={handleTakePhotoFromStream}>
              Take Photo
            </Button>
            <Button
              type="button"
              onClick={handleCancelCamera}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="w-full aspect-[3/2] rounded-lg bg-slate-200 flex items-center justify-center mb-2">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Waypoint"
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center">
            <MapPinIcon className="h-12 w-12" />
            <span>No image provided.</span>
          </div>
        )}
      </div>
      {imageError && <p className="text-red-500 text-sm pb-2">{imageError}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleCaptureImageClick}
          className="flex-grow min-w-[calc(50%-0.25rem)]"
        >
          <CameraIcon className="h-5 w-5 mr-2" />
          Open Camera
        </Button>
        <Button
          type="button"
          onClick={handleChooseFileClick}
          variant="secondary"
          className="flex-grow min-w-[calc(50%-0.25rem)]"
        >
          <PhotoIcon className="h-5 w-5 mr-2" />
          Choose from File
        </Button>
        {capturedImage && (
          <Button
            type="button"
            onClick={handleRemoveImageClick}
            variant="destructive"
            className="w-full mt-2"
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            Remove Image
          </Button>
        )}
      </div>
    </div>
  );
}
