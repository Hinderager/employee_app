"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CameraIcon, PhotoIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function PicturesPage() {
  const [jobNumber, setJobNumber] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: MediaFile[] = [];
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isImage || isVideo) {
        const preview = URL.createObjectURL(file);
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          file,
          preview,
          type: isVideo ? 'video' : 'image'
        });
      }
    });

    setMediaFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (mediaFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('jobNumber', jobNumber.trim());
      formData.append('loadNumber', loadNumber.trim());

      mediaFiles.forEach((mediaFile) => {
        formData.append('files', mediaFile.file);
      });

      const response = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      alert(`Successfully uploaded ${result.uploadedCount} files!`);

      // Clear files after successful upload
      mediaFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setMediaFiles([]);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to upload files: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/home" className="p-2 -ml-2 active:bg-white/10 rounded-lg">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Pictures</h1>
            <p className="text-sm text-gray-100">Upload photos and videos</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 space-y-6">
        {/* Job Number Section */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-4">
            <input
              id="jobNumber"
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Enter job number (optional)"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-topshelf-yellow"
            />
            <button
              onClick={() => {}}
              className="px-6 py-2 bg-topshelf-blue rounded-lg font-semibold text-white transition-colors"
            >
              Load
            </button>
            <button
              onClick={() => {
                setJobNumber("");
                mediaFiles.forEach(f => URL.revokeObjectURL(f.preview));
                setMediaFiles([]);
              }}
              className="px-6 py-2 bg-gray-500 rounded-lg font-semibold text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Camera and Upload Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="bg-blue-500 text-white rounded-2xl shadow-md p-6 active:scale-95 transition-transform flex flex-col items-center"
          >
            <CameraIcon className="h-12 w-12 mb-2" />
            <span className="font-bold">Take Photo/Video</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-purple-500 text-white rounded-2xl shadow-md p-6 active:scale-95 transition-transform flex flex-col items-center"
          >
            <PhotoIcon className="h-12 w-12 mb-2" />
            <span className="font-bold">Choose Files</span>
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Selected Files ({mediaFiles.length})
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative">
                  {media.type === 'image' ? (
                    <img
                      src={media.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="relative w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <VideoCameraIcon className="h-8 w-8 text-gray-500" />
                      <video
                        src={media.preview}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveFile(media.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`w-full py-3 rounded-lg font-bold text-white ${
                isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 active:scale-95 transition-transform'
              }`}
            >
              {isUploading ? 'Uploading...' : `Upload ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''} to Google Drive`}
            </button>
          </div>
        )}

        {/* Instructions */}
        {mediaFiles.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Optionally enter a job number</li>
              <li>Take photos/videos or choose from your device</li>
              <li>Review your selections</li>
              <li>Click upload to save to Google Drive</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
