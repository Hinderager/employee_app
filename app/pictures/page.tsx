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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [includeCompletedJobs, setIncludeCompletedJobs] = useState(false);
  const [loadNumber, setLoadNumber] = useState("");
  const [address, setAddress] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [multipleForms, setMultipleForms] = useState<any[]>([]);
  const [showFormSelection, setShowFormSelection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleLoadJob = async () => {
    // Require at least one parameter
    if ((!jobNumber || !jobNumber.trim()) && (!phoneNumber || !phoneNumber.trim())) {
      alert('Please enter a job number or phone number');
      return;
    }

    setIsLoadingJob(true);
    setIsCreatingFolder(true);
    setShowFormSelection(false);

    try {
      const response = await fetch('/api/load-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber: jobNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          includeCompletedJobs: includeCompletedJobs
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load job');
      }

      // Handle multiple forms found
      if (result.multiple && result.forms && result.forms.length > 1) {
        setMultipleForms(result.forms);
        setShowFormSelection(true);
        setIsCreatingFolder(false);
        setIsLoadingJob(false);
        return;
      }

      // Single result - load it directly
      setAddress(result.address);
      if (result.job_number) {
        setJobNumber(result.job_number);
      }

      // Folder is now always created by the API
      if (result.folderUrl) {
        setFolderUrl(result.folderUrl);
      }
    } catch (error) {
      console.error('Load job error:', error);
      alert(error instanceof Error ? error.message : 'Failed to load job. Please try again.');
    } finally {
      setIsLoadingJob(false);
      setIsCreatingFolder(false);
    }
  };

  const handleSelectForm = (selectedIndex: number) => {
    const selectedForm = multipleForms[selectedIndex];

    // Load the selected form
    setAddress(selectedForm.address);
    setJobNumber(selectedForm.jobNumber);
    setFolderUrl(selectedForm.folderUrl || '');
    setShowFormSelection(false);
    setMultipleForms([]);
  };

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
      formData.append('address', address); // Pass address to upload endpoint

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

      // Save the folder URL for display
      if (result.folderUrl) {
        setFolderUrl(result.folderUrl);
      }

      alert(`Successfully uploaded ${result.uploadedCount} files!`);

      // Clear files after successful upload
      mediaFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setMediaFiles([]);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Pictures</h1>
            {isLoadingJob ? (
              <div className="flex items-center gap-2 text-sm text-gray-100">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Loading job details...</span>
              </div>
            ) : address ? (
              <p className="text-sm text-gray-100">{address}</p>
            ) : (
              <p className="text-sm text-gray-100">Upload photos and videos</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 py-8 space-y-6">
        {/* Job Number and Phone Number Section */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                id="jobNumber"
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="Job #"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-topshelf-yellow"
              />
              <span className="text-gray-500 font-semibold">OR</span>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone Number"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-topshelf-yellow"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="includeCompletedJobs"
                type="checkbox"
                checked={includeCompletedJobs}
                onChange={(e) => setIncludeCompletedJobs(e.target.checked)}
                className="h-4 w-4 text-topshelf-blue focus:ring-topshelf-yellow border-gray-300 rounded"
              />
              <label htmlFor="includeCompletedJobs" className="text-sm text-gray-700">
                Include Completed Jobs
              </label>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleLoadJob}
                disabled={isLoadingJob}
                className="px-6 py-2 bg-topshelf-blue rounded-lg font-semibold text-white transition-colors disabled:bg-gray-400"
              >
                {isLoadingJob ? 'Loading...' : 'Load'}
              </button>
              <button
                onClick={() => {
                  setJobNumber("");
                  setPhoneNumber("");
                  setAddress("");
                  setFolderUrl("");
                  setIsCreatingFolder(false);
                  setShowFormSelection(false);
                  setMultipleForms([]);
                  mediaFiles.forEach(f => URL.revokeObjectURL(f.preview));
                  setMediaFiles([]);
                }}
                className="px-6 py-2 bg-gray-500 rounded-lg font-semibold text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          {address && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">Address:</p>
              <p className="text-sm text-green-800">{address}</p>
              {isCreatingFolder && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                    <span>Creating folder...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Multiple Forms Selection */}
        {showFormSelection && multipleForms.length > 1 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Multiple jobs found. Please select one:
            </h2>
            <div className="space-y-2">
              {multipleForms.map((form, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectForm(index)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-semibold text-gray-900">{form.address}</div>
                  {form.jobNumber && (
                    <div className="text-sm text-gray-600">Job #{form.jobNumber}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    Updated: {new Date(form.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camera and Upload Buttons */}
        {folderUrl || isCreatingFolder ? (
          /* Job loaded or loading - show single Google Drive link button */
          <div className="flex justify-center">
            <a
              href={folderUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-white rounded-2xl shadow-md p-8 transition-transform flex flex-col items-center w-full max-w-md ${
                isCreatingFolder
                  ? 'bg-gray-400 cursor-not-allowed opacity-50 pointer-events-none'
                  : 'bg-green-500 active:scale-95 hover:bg-green-600'
              }`}
            >
              <PhotoIcon className="h-16 w-16 mb-3" />
              <span className="font-bold text-lg text-center">
                {isCreatingFolder ? 'Loading...' : `Upload Photo/Video to ${address} Folder`}
              </span>
              <span className="text-sm mt-2 opacity-90">
                {isCreatingFolder ? 'Creating folder in Google Drive' : 'Opens Google Drive'}
              </span>
            </a>
          </div>
        ) : (
          /* No job loaded - show single General Media button */
          <div className="flex justify-center">
            <a
              href="https://drive.google.com/drive/u/0/folders/1qgTSIsI3uVjc6qINSnrVpWr5qdz3N_XI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white rounded-2xl shadow-md p-8 transition-transform flex flex-col items-center w-full max-w-md bg-blue-500 active:scale-95 hover:bg-blue-600"
            >
              <PhotoIcon className="h-16 w-16 mb-3" />
              <span className="font-bold text-lg">Upload Photo/Video to General Media</span>
              <span className="text-sm mt-2 opacity-90">Opens Google Drive</span>
            </a>
          </div>
        )}

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
        {mediaFiles.length === 0 && !folderUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Enter a job number and click Load to create a job-specific folder</li>
              <li>Click the button to upload directly to the customer folder</li>
              <li>Or, upload without a job number to send pictures and videos to the general media folder</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
