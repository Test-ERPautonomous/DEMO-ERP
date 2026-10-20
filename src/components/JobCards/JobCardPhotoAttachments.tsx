import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Download, 
  Trash2, 
  FolderDown, 
  HardDrive, 
  Eye, 
  X, 
  Check, 
  AlertCircle, 
  FileText, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  Tag,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { JobCardPhoto, processImageFile, savePhotosForJobCard, loadPhotosForJobCard } from '../../utils/photoStorage';

export interface JobCardPhotoAttachmentsProps {
  jobCardId: string;
  jobCardNumber: string;
  vehiclePlate?: string;
  isEditMode: boolean;
  onPhotosChange?: (photos: JobCardPhoto[]) => void;
  initialPhotos?: JobCardPhoto[];
}

const PHOTO_CATEGORIES = [
  { id: 'pre_inspection', label: 'Pre-Inspection Condition', icon: '🚗' },
  { id: 'damage', label: 'Damage / Scratches', icon: '💥' },
  { id: 'engine_bay', label: 'Engine & Mechanical', icon: '⚙️' },
  { id: 'tires_wheels', label: 'Tires & Underbody', icon: '🛞' },
  { id: 'odometer_fuel', label: 'Odometer & Fuel Gauge', icon: '⏱️' },
  { id: 'parts_replaced', label: 'Replaced Spares & Parts', icon: '📦' },
  { id: 'final_delivery', label: 'Final Delivery & Finished', icon: '✨' },
  { id: 'documents', label: 'Paperwork / Documents', icon: '📄' },
];

export const JobCardPhotoAttachments: React.FC<JobCardPhotoAttachmentsProps> = ({
  jobCardId,
  jobCardNumber,
  vehiclePlate = '',
  isEditMode,
  onPhotosChange,
  initialPhotos = []
}) => {
  const [photos, setPhotos] = useState<JobCardPhoto[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('pre_inspection');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<JobCardPhoto | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load photos from IndexedDB on mount or when jobCardId changes
  useEffect(() => {
    let isMounted = true;
    if (jobCardId) {
      loadPhotosForJobCard(jobCardId).then(saved => {
        if (isMounted) {
          if (saved && saved.length > 0) {
            setPhotos(saved);
            onPhotosChange?.(saved);
          } else if (initialPhotos && initialPhotos.length > 0) {
            setPhotos(initialPhotos);
          }
        }
      });
    }
    return () => { isMounted = false; };
  }, [jobCardId]);

  // Sync to parent and IndexedDB when photos array updates
  const updatePhotos = (newPhotos: JobCardPhoto[]) => {
    setPhotos(newPhotos);
    onPhotosChange?.(newPhotos);
    if (jobCardId) {
      savePhotosForJobCard(jobCardId, newPhotos);
    }
  };

  const showStatus = (text: string, type: 'success' | 'info' | 'error' = 'success', duration = 3500) => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, duration);
  };

  // Process files
  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showStatus('Please select image files (JPG, PNG, WEBP).', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const newItems: JobCardPhoto[] = [];
      for (const file of validFiles) {
        const { dataUrl, size } = await processImageFile(file);
        const photoItem: JobCardPhoto = {
          id: `PHOTO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          jobCardId: jobCardId || 'draft',
          name: file.name,
          type: file.type || 'image/jpeg',
          size,
          dataUrl,
          category: selectedCategory,
          caption: '',
          timestamp: new Date().toISOString()
        };
        newItems.push(photoItem);
      }

      const merged = [...photos, ...newItems];
      updatePhotos(merged);
      showStatus(`Added ${newItems.length} photo(s) successfully! Ready to save to your local drive.`, 'success');
    } catch (err: any) {
      console.error(err);
      showStatus('Failed to process photos: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Save single photo directly to local hard drive
  const downloadSinglePhoto = (photo: JobCardPhoto) => {
    const cleanJobNo = (jobCardNumber || 'JobCard').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanPlate = (vehiclePlate || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = photo.type.includes('png') ? 'png' : 'jpg';
    const filename = `${cleanJobNo}_${cleanPlate ? cleanPlate + '_' : ''}${photo.category}_${photo.id.slice(-6)}.${ext}`;

    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus(`Saved "${filename}" to your computer's Downloads/Local Drive!`, 'success');
  };

  // Save ALL photos bundled into a ZIP file to local hard drive
  const saveAllPhotosAsZip = async () => {
    if (photos.length === 0) {
      showStatus('No photos attached to save.', 'info');
      return;
    }

    try {
      showStatus('Packaging photos into ZIP archive for local drive saving...', 'info', 2000);
      const zip = new JSZip();
      const cleanJobNo = (jobCardNumber || 'JobCard').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanPlate = (vehiclePlate || '').replace(/[^a-zA-Z0-9_-]/g, '_');

      // Create a folder in zip
      const folderName = `${cleanJobNo}_Vehicle_Photos`;
      const imgFolder = zip.folder(folderName) || zip;

      // Manifest summary
      const manifest: string[] = [
        `JOB CARD VEHICLE ATTACHMENTS MANIFEST`,
        `=====================================`,
        `Job Card Number: ${jobCardNumber}`,
        `Vehicle Plate: ${vehiclePlate}`,
        `Total Photos: ${photos.length}`,
        `Export Date: ${new Date().toLocaleString()}`,
        ``,
        `PHOTOS LIST:`,
        `-------------------------------------`
      ];

      photos.forEach((photo, idx) => {
        // Base64 data strip
        const base64Data = photo.dataUrl.split(',')[1];
        const ext = photo.type.includes('png') ? 'png' : 'jpg';
        const photoName = `${idx + 1}_${photo.category}_${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const finalName = photoName.endsWith(`.${ext}`) ? photoName : `${photoName}.${ext}`;

        imgFolder.file(finalName, base64Data, { base64: true });
        manifest.push(`${idx + 1}. ${finalName} [Category: ${photo.category}] [Caption: ${photo.caption || 'None'}] [Date: ${new Date(photo.timestamp).toLocaleString()}]`);
      });

      imgFolder.file('MANIFEST.txt', manifest.join('\n'));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const zipName = `${cleanJobNo}_${cleanPlate ? cleanPlate + '_' : ''}Photos.zip`;

      const link = document.createElement('a');
      link.href = url;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showStatus(`✓ Successfully saved all ${photos.length} photos in "${zipName}" to your local drive!`, 'success', 5000);
    } catch (err: any) {
      console.error(err);
      showStatus('Failed to generate ZIP archive: ' + err.message, 'error');
    }
  };

  // Direct Directory Picker Save (File System Access API)
  const saveDirectlyToFolder = async () => {
    if (photos.length === 0) {
      showStatus('No photos attached to save.', 'info');
      return;
    }

    // Check if showDirectoryPicker is supported in this browser
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        showStatus('Saving files directly to selected local drive directory...', 'info');

        let savedCount = 0;
        for (let idx = 0; idx < photos.length; idx++) {
          const photo = photos[idx];
          const ext = photo.type.includes('png') ? 'png' : 'jpg';
          const cleanJobNo = (jobCardNumber || 'JC').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${cleanJobNo}_${idx + 1}_${photo.category}.${ext}`;

          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();

          // Convert base64 to binary
          const byteString = atob(photo.dataUrl.split(',')[1]);
          const mimeString = photo.dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });

          await writable.write(blob);
          await writable.close();
          savedCount++;
        }

        showStatus(`✓ Successfully saved all ${savedCount} photos directly to your selected local drive folder!`, 'success', 5000);
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('Directory Picker error, falling back to ZIP:', err);
        // Fallback to ZIP download
        saveAllPhotosAsZip();
      }
    } else {
      // Browser doesn't support File System Access API, fallback to ZIP download
      saveAllPhotosAsZip();
    }
  };

  // Delete photo
  const deletePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    updatePhotos(updated);
    if (previewPhoto?.id === id) {
      setPreviewPhoto(null);
    }
    showStatus('Photo deleted from Job Card.', 'info');
  };

  // Update photo caption or category
  const updatePhotoMeta = (id: string, updates: Partial<JobCardPhoto>) => {
    const updated = photos.map(p => p.id === id ? { ...p, ...updates } : p);
    updatePhotos(updated);
  };

  // Filter photos
  const filteredPhotos = filterCategory === 'ALL' 
    ? photos 
    : photos.filter(p => p.category === filterCategory);

  const totalSizeMB = (photos.reduce((acc, p) => acc + (p.size || 0), 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="h-full flex flex-col bg-slate-50 border border-slate-300 rounded-sm overflow-hidden text-slate-800">
      {/* Top Action & Local Drive Control Bar */}
      <div className="p-3 bg-white border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>Vehicle Photo Attachments & Inspection Records</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {photos.length} Photo{photos.length !== 1 ? 's' : ''} ({totalSizeMB} MB)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Add pre-inspection, damages, odometer, or repair photos. Save all images directly to your computer's local drive.
          </p>
        </div>

        {/* Local Drive Save & Export Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Direct Folder Save (File System Access) */}
          <button
            type="button"
            onClick={saveDirectlyToFolder}
            disabled={photos.length === 0}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Choose a folder on your hard drive to save all vehicle photos directly"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Save to Local Drive</span>
          </button>

          {/* Save All as ZIP Download */}
          <button
            type="button"
            onClick={saveAllPhotosAsZip}
            disabled={photos.length === 0}
            className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Download a single .ZIP file containing all photos with manifest to your local drive"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>Download All (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : statusMessage.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-600" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[10px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload & Category Selection Bar */}
      <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700">Photo Tag:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 font-medium outline-none focus:border-sky-500"
          >
            {PHOTO_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Trigger buttons */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-sky-500 transition"
          >
            <Upload className="w-3.5 h-3.5 text-sky-600" />
            <span>Upload Photos</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-sky-500 transition"
            title="Take a photo with connected camera or mobile tablet"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Capture with Camera</span>
          </button>
        </div>

        {/* Filter by Category */}
        {photos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Filter:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 font-medium outline-none text-[11px]"
            >
              <option value="ALL">All Categories ({photos.length})</option>
              {PHOTO_CATEGORIES.map(c => {
                const count = photos.filter(p => p.category === c.id).length;
                if (count === 0) return null;
                return (
                  <option key={c.id} value={c.id}>{c.icon} {c.label} ({count})</option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Main Drag-and-Drop Area & Photo Gallery Grid */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex-1 p-4 overflow-y-auto transition-colors ${
          isDragOver ? 'bg-sky-50/80 border-2 border-dashed border-sky-400' : 'bg-slate-100/50'
        }`}
      >
        {photos.length === 0 ? (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-white">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 shadow-inner">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Vehicle Photos Attached Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Drag & drop photos of the car, damage areas, odometer reading, or parts here, or click upload to browse your computer.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Upload From Computer</span>
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4 text-slate-600" />
                <span>Take Photo</span>
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>All attached photos can be saved locally on your hard drive at any time.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredPhotos.map((photo, index) => {
              const catObj = PHOTO_CATEGORIES.find(c => c.id === photo.category);
              const sizeKB = Math.round(photo.size / 1024);

              return (
                <div 
                  key={photo.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Thumbnail Image with overlay actions */}
                  <div 
                    onClick={() => {
                      setPreviewPhoto(photo);
                      setPreviewIndex(photos.findIndex(p => p.id === photo.id));
                    }}
                    className="relative aspect-4/3 bg-slate-900 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Category Badge overlay */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <span>{catObj?.icon || '📷'}</span>
                      <span className="truncate max-w-[130px]">{catObj?.label || 'General'}</span>
                    </div>

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPhoto(photo);
                          setPreviewIndex(photos.findIndex(p => p.id === photo.id));
                        }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-md transition"
                        title="View Full Size"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSinglePhoto(photo);
                        }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-emerald-700 shadow-md transition"
                        title="Save to Local Drive"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Details & Caption Input */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px]" title={photo.name}>{photo.name}</span>
                        <span>{sizeKB} KB</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Add caption or note..."
                        value={photo.caption || ''}
                        onChange={(e) => updatePhotoMeta(photo.id, { caption: e.target.value })}
                        className="w-full mt-1.5 px-2 py-1 text-xs border border-slate-200 rounded-md outline-none focus:border-sky-500 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    {/* Bottom controls: Download to Local Drive & Delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => downloadSinglePhoto(photo)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Download and save this photo to your local drive"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save to Drive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePhoto(photo.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Image Viewer */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-150">
          {/* Lightbox Header */}
          <div className="p-4 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {PHOTO_CATEGORIES.find(c => c.id === previewPhoto.category)?.icon || '📷'}
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {previewPhoto.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {PHOTO_CATEGORIES.find(c => c.id === previewPhoto.category)?.label} • {new Date(previewPhoto.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadSinglePhoto(previewPhoto)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Save this photo to your computer's local drive"
              >
                <Download className="w-4 h-4" />
                <span>Save to Local Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close Viewer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Display with Navigation */}
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const prevIdx = (previewIndex - 1 + photos.length) % photos.length;
                  setPreviewIndex(prevIdx);
                  setPreviewPhoto(photos[prevIdx]);
                }}
                className="absolute left-4 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition z-10 cursor-pointer"
                title="Previous Photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={previewPhoto.dataUrl}
              alt={previewPhoto.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (previewIndex + 1) % photos.length;
                  setPreviewIndex(nextIdx);
                  setPreviewPhoto(photos[nextIdx]);
                }}
                className="absolute right-4 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition z-10 cursor-pointer"
                title="Next Photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Caption Footer */}
          {previewPhoto.caption && (
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center text-xs text-slate-300">
              {previewPhoto.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
