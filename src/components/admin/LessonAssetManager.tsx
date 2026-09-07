import React, { useState, useEffect } from 'react';
import { detectResourceType } from '../../utils/resourceType.ts';
import {
  initContentUpload,
  uploadFileToSignedUrl,
  completeContentUpload,
  fetchLessonAssets,
  attachContentAsset,
  detachContentAsset
} from '../../services/api.ts';
import {
  UploadCloud,
  FileText,
  Video,
  FileCode,
  Database,
  Link as LinkIcon,
  Globe,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface LessonAssetManagerProps {
  token: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  onAssetsUpdated?: () => void;
}

export const LessonAssetManager: React.FC<LessonAssetManagerProps> = ({
  token,
  lessonId,
  lessonTitle,
  lessonType,
  onAssetsUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [assetsData, setAssetsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'attach' | 'inventory'>('inventory');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [resourceType, setResourceType] = useState<string>(lessonType === 'VIDEO' ? 'VIDEO' : 'NOTE');
  const [isPrimary, setIsPrimary] = useState<boolean>(true);
  const [languageCode, setLanguageCode] = useState<string>('en');

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // External attach state
  const [attachTitle, setAttachTitle] = useState('');
  const [attachType, setAttachType] = useState('LINK');
  const [attachUrl, setAttachUrl] = useState('');
  const [attaching, setAttaching] = useState(false);

  const loadAssets = async () => {
    if (!token || !lessonId) return;
    setLoading(true);
    try {
      const res = await fetchLessonAssets(token, lessonId);
      if (res.success) {
        setAssetsData(res);
      }
    } catch (err) {
      console.error('Failed to load lesson assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [token, lessonId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      // Automatic detection without blind requestedType override
      const detected = detectResourceType(file.name, file.type, undefined);
      setResourceType(detected);
    }
  };

  const handleDirectUpload = async () => {
    if (!selectedFile || !token) return;

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage({ text: 'Initializing secure upload session...', isError: false });

    try {
      // 1. Initialize upload session & obtain pre-signed URL from server
      const initRes = await initContentUpload(token, {
        lessonId,
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        resourceType,
        isPrimary,
        languageCode,
        title: uploadTitle || selectedFile.name
      });

      if (!initRes.success) {
        setStatusMessage({ text: initRes.error || 'Failed to initialize upload.', isError: true });
        setUploading(false);
        return;
      }

      setStatusMessage({ text: 'Uploading file directly to object storage...', isError: false });

      // 2. Upload file directly to Supabase Storage pre-signed URL
      const uploadRes = await uploadFileToSignedUrl(initRes.signedUrl, selectedFile, (percent) => {
        setUploadProgress(percent);
      });

      if (!uploadRes.success) {
        setStatusMessage({ text: uploadRes.error || 'Direct upload to storage failed.', isError: true });
        setUploading(false);
        return;
      }

      setStatusMessage({ text: 'Finalizing asset registration & readiness status...', isError: false });

      // 3. Finalize asset record in backend
      const completeRes = await completeContentUpload(token, {
        lessonId,
        storagePath: initRes.storagePath,
        title: uploadTitle || selectedFile.name,
        resourceType,
        isPrimary,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        languageCode
      });

      if (completeRes.success) {
        setStatusMessage({ text: 'Content uploaded and attached successfully!', isError: false });
        setSelectedFile(null);
        setUploadTitle('');
        setActiveTab('inventory');
        loadAssets();
        if (onAssetsUpdated) onAssetsUpdated();
      } else {
        setStatusMessage({ text: completeRes.error || 'Failed to finalize asset registration.', isError: true });
      }
    } catch (err: any) {
      console.error('Upload execution error:', err);
      setStatusMessage({ text: err.message || 'Upload failed due to network error.', isError: true });
    } finally {
      setUploading(false);
    }
  };

  const handleAttachExternal = async () => {
    if (!attachTitle.trim() || !attachUrl.trim() || !token) return;
    setAttaching(true);
    try {
      const res = await attachContentAsset(token, {
        lessonId,
        title: attachTitle.trim(),
        resourceType: attachType,
        fileUrl: attachUrl.trim(),
        isPrimary: false
      });
      if (res.success) {
        setAttachTitle('');
        setAttachUrl('');
        setActiveTab('inventory');
        loadAssets();
        if (onAssetsUpdated) onAssetsUpdated();
      } else {
        alert(res.error || 'Failed to attach external link.');
      }
    } catch (err: any) {
      alert(err.message || 'Error attaching link.');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetachAsset = async (assetId: string) => {
    if (!token || !confirm('Detach this resource asset from the lesson?')) return;
    try {
      const res = await detachContentAsset(token, assetId, false);
      if (res.success) {
        loadAssets();
        if (onAssetsUpdated) onAssetsUpdated();
      } else {
        alert(res.error || 'Failed to detach asset.');
      }
    } catch (err: any) {
      alert(err.message || 'Error detaching asset.');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4 text-rose-600" />;
      case 'PDF':
      case 'NOTE':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'CODE':
      case 'NOTEBOOK':
        return <FileCode className="w-4 h-4 text-indigo-600" />;
      case 'DATASET':
        return <Database className="w-4 h-4 text-emerald-700" />;
      default:
        return <Globe className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Lesson Assets & Content</span>
          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
            {assetsData?.resources?.length || 0} Assets
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'inventory'
              ? 'bg-amber-500 text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${activeTab === 'upload'
              ? 'bg-amber-500 text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Direct Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('attach')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${activeTab === 'attach'
              ? 'bg-amber-500 text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Attach Link</span>
          </button>
        </div>
      </div>

      {/* DIRECT UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-600" />
              <span>Direct-to-Storage Ingestion</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload large video files, notebooks, PDFs, or datasets directly to Supabase Storage via signed URLs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Select File *</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full mt-1 text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Title *</label>
              <input
                type="text"
                placeholder="Asset title or label..."
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Resource Type *</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="VIDEO">VIDEO (2 GB Limit)</option>
                <option value="PDF">PDF (100 MB Limit)</option>
                <option value="PPT">PPT (100 MB Limit)</option>
                <option value="NOTE">NOTE (100 MB Limit)</option>
                <option value="CODE">CODE (20 MB Limit)</option>
                <option value="DATASET">DATASET (200 MB Limit)</option>
                <option value="NOTEBOOK">NOTEBOOK (200 MB Limit)</option>
                <option value="SUBTITLE">SUBTITLE (20 MB Limit)</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-bold">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-0"
                />
                <span>Set as Primary Lesson Asset</span>
              </label>

              {resourceType === 'SUBTITLE' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Lang:</span>
                  <input
                    type="text"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="en"
                    className="w-16 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* File Detection Banner */}
          {selectedFile && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-indigo-900 font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-semibold uppercase shrink-0">
                  Detected Type: {resourceType}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Primary Content: <strong>{isPrimary ? 'YES' : 'NO'}</strong> | File Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          )}

          {/* Upload Status & Progress */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs font-bold ${statusMessage.isError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}>
              {statusMessage.text}
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>Direct Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-amber-500 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleDirectUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>{uploading ? 'Uploading...' : 'Start Direct Upload'}</span>
            </button>
          </div>
        </div>
      )}

      {/* EXTERNAL LINK ATTACH TAB */}
      {activeTab === 'attach' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-sky-600" />
              <span>Attach External URL or Reference</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Attach external YouTube/Vimeo video links, GitHub code repositories, Google Drive docs, or web URLs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Resource Title *</label>
              <input
                type="text"
                placeholder="Resource Title..."
                value={attachTitle}
                onChange={(e) => setAttachTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Resource Type *</label>
              <select
                value={attachType}
                onChange={(e) => setAttachType(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
              >
                <option value="LINK">External Link</option>
                <option value="VIDEO">Video Stream URL</option>
                <option value="PDF">PDF URL</option>
                <option value="CODE">Code Repository</option>
                <option value="DATASET">Dataset URL</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">URL / Link Target *</label>
              <input
                type="text"
                placeholder="https://..."
                value={attachUrl}
                onChange={(e) => setAttachUrl(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleAttachExternal}
              disabled={!attachTitle.trim() || !attachUrl.trim() || attaching}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {attaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
              <span>{attaching ? 'Attaching...' : 'Attach Resource'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ASSET INVENTORY LIST */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          {/* Primary Video Indicator */}
          {assetsData?.lesson?.video_url ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span className="truncate">
                  <strong>Primary Video Content Configured</strong> ({assetsData.lesson.video_url.slice(0, 45)}...)
                </span>
              </div>
              {assetsData.lesson.signed_video_url && (
                <a
                  href={assetsData.lesson.signed_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300 shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview Signed Stream</span>
                </a>
              )}
            </div>
          ) : lessonType === 'VIDEO' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Primary Video Asset Missing:</strong> This VIDEO lesson requires a video file or stream URL before the course can be published.
              </span>
            </div>
          ) : null}

          {loading ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Loading attached assets...</span>
            </div>
          ) : !assetsData?.resources || assetsData.resources.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs italic text-center">
              No supplementary resources attached yet. Use Direct Upload or Attach Link to add files.
            </div>
          ) : (
            <div className="space-y-2">
              {assetsData.resources.map((res: any) => (
                <div
                  key={res.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0">
                      {renderIcon(res.resource_type)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs truncate">{res.title}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase border border-indigo-100">
                          {res.resource_type}
                        </span>
                        {res.is_primary || res.file_url === assetsData?.lesson?.video_url ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-semibold uppercase border border-amber-200">
                            Primary Content
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-semibold uppercase border border-slate-200">
                            Supplementary
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-md">
                        {res.file_url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {res.signed_url && (
                      <a
                        href={res.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-slate-200"
                        title="Preview with temporary signed URL"
                      >
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>Preview</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleDetachAsset(res.id)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                      title="Detach Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
