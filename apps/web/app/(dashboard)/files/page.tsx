"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  Upload,
  Trash2,
  Download,
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Search,
  Grid3X3,
  List,
  HardDrive,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import {
  listFiles,
  uploadFiles,
  createFolder,
  deleteFile,
  deleteFiles,
  getDownloadUrl,
  getStorageStats,
  type FileItem,
} from "./actions";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileIcon(name: string, mimetype: string) {
  if (mimetype.startsWith("image/")) return FileImage;
  if (mimetype.startsWith("video/")) return FileVideo;
  if (mimetype.startsWith("audio/")) return FileAudio;
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel") || name.endsWith(".csv"))
    return FileSpreadsheet;
  if (mimetype.includes("json") || mimetype.includes("javascript") || mimetype.includes("typescript"))
    return FileCode;
  if (mimetype.includes("pdf") || mimetype.includes("document") || mimetype.includes("text"))
    return FileText;
  return File;
}

function getFileColor(mimetype: string): string {
  if (mimetype.startsWith("image/")) return "text-pink-400";
  if (mimetype.startsWith("video/")) return "text-purple-400";
  if (mimetype.startsWith("audio/")) return "text-green-400";
  if (mimetype.includes("pdf")) return "text-red-400";
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return "text-emerald-400";
  if (mimetype.includes("json") || mimetype.includes("javascript")) return "text-yellow-400";
  return "text-[#4FC3F7]";
}

// ─── Component ────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFiles(currentFolder);
      setFiles(result.files.filter((f) => f.name !== ".keep" && f.name !== ".emptyFolderPlaceholder"));
      setBreadcrumbs(result.breadcrumbs);
    } catch {
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getStorageStats();
      setStats(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentFolder(path);
    setSelected(new Set());
    setSearchQuery("");
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(fileList).forEach((f) => fd.append("files", f));
    try {
      const result = await uploadFiles(currentFolder, fd);
      if (result.uploaded > 0) {
        toast.success(`Uploaded ${result.uploaded} file${result.uploaded > 1 ? "s" : ""}`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach((e) => toast.error(e));
      }
      loadFiles();
      loadStats();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const result = await createFolder(currentFolder, name);
    if (result.success) {
      toast.success(`Folder "${name}" created`);
      setShowNewFolder(false);
      setNewFolderName("");
      loadFiles();
    } else {
      toast.error(result.error || "Failed to create folder");
    }
  };

  const handleDelete = async (filePath: string, fileName: string) => {
    const result = await deleteFile(filePath);
    if (result.success) {
      toast.success(`Deleted "${fileName}"`);
      loadFiles();
      loadStats();
    } else {
      toast.error(result.error || "Delete failed");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const paths = Array.from(selected);
    const result = await deleteFiles(paths);
    if (result.deleted > 0) {
      toast.success(`Deleted ${result.deleted} item${result.deleted > 1 ? "s" : ""}`);
      setSelected(new Set());
      loadFiles();
      loadStats();
    }
    if (result.errors.length > 0) {
      result.errors.forEach((e) => toast.error(e));
    }
  };

  const handleDownload = async (filePath: string) => {
    const result = await getDownloadUrl(filePath);
    if (result.url) {
      window.open(result.url, "_blank");
    } else {
      toast.error(result.error || "Download failed");
    }
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredFiles.map((f) => f.path)));
    }
  };

  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  // ─── Drag & Drop ──────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-[#4FC3F7] bg-[#111] p-16 text-center">
            <Upload className="mx-auto h-16 w-16 text-[#4FC3F7]" />
            <p className="mt-4 text-xl font-semibold text-white">Drop files to upload</p>
            <p className="mt-2 text-sm text-[#9ca3af]">Files will be uploaded to the current folder</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Files</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {stats.totalFiles} files &middot; {formatBytes(stats.totalSize)} used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Breadcrumbs + controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-[#555]" />}
              <button
                onClick={() => navigateTo(crumb.path)}
                className={`rounded px-1.5 py-0.5 hover:bg-[#1a1a1a] ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-white"
                    : "text-[#9ca3af] hover:text-white"
                }`}
              >
                {i === 0 ? <Home className="inline h-3.5 w-3.5" /> : crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-[#222] bg-[#0a0a0a] py-2 pl-9 pr-3 text-sm text-white placeholder-[#555] outline-none focus:border-[#4FC3F7]"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="rounded-lg border border-[#222] bg-[#111] p-2 text-[#9ca3af] hover:text-white"
            aria-label={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </button>
          <button
            onClick={loadFiles}
            className="rounded-lg border border-[#222] bg-[#111] p-2 text-[#9ca3af] hover:text-white"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#333] bg-[#111] px-4 py-2">
          <span className="text-sm text-[#9ca3af]">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-[#9ca3af] hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* New folder input */}
      {showNewFolder && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#4FC3F7] bg-[#111] px-4 py-3">
          <FolderOpen className="h-5 w-5 text-[#F5C542]" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="Folder name"
            autoFocus
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-[#555]"
          />
          <button onClick={handleCreateFolder} className="rounded p-1 text-green-400 hover:bg-green-400/10">
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
            className="rounded p-1 text-[#9ca3af] hover:bg-[#1a1a1a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* File list */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#1a1a1a]" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#333] py-20">
            <HardDrive className="h-12 w-12 text-[#333]" />
            <p className="mt-4 text-lg font-medium text-[#9ca3af]">
              {searchQuery ? "No files match your search" : "This folder is empty"}
            </p>
            <p className="mt-1 text-sm text-[#555]">
              {searchQuery ? "Try a different search term" : "Upload files or create a folder to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ─── List View ─── */
          <div className="rounded-xl border border-[#1a1a1a] bg-[#111] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 border-b border-[#1a1a1a] px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[#555]">
              <input
                type="checkbox"
                checked={selected.size === filteredFiles.length && filteredFiles.length > 0}
                onChange={selectAll}
                className="h-3.5 w-3.5 rounded border-[#333] bg-[#0a0a0a]"
              />
              <span className="flex-1">Name</span>
              <span className="hidden w-24 sm:block">Size</span>
              <span className="hidden w-28 md:block">Modified</span>
              <span className="w-8" />
            </div>
            {filteredFiles.map((file) => {
              const Icon = file.isFolder ? FolderOpen : getFileIcon(file.name, file.mimetype);
              const color = file.isFolder ? "text-[#F5C542]" : getFileColor(file.mimetype);
              return (
                <div
                  key={file.path}
                  className={`group flex items-center gap-4 border-b border-[#1a1a1a] px-4 py-3 transition-colors last:border-0 hover:bg-[#0d0d0d] ${
                    selected.has(file.path) ? "bg-[#4FC3F710]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(file.path)}
                    onChange={() => toggleSelect(file.path)}
                    className="h-3.5 w-3.5 rounded border-[#333] bg-[#0a0a0a]"
                  />
                  <button
                    onClick={() =>
                      file.isFolder ? navigateTo(file.path) : handleDownload(file.path)
                    }
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                    <span className="truncate text-sm text-white group-hover:text-[#4FC3F7]">
                      {file.name}
                    </span>
                  </button>
                  <span className="hidden w-24 text-xs text-[#9ca3af] sm:block">
                    {file.isFolder ? "--" : formatBytes(file.size)}
                  </span>
                  <span className="hidden w-28 text-xs text-[#9ca3af] md:block">
                    {formatDate(file.updated_at)}
                  </span>
                  <div className="relative w-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu(
                          contextMenu?.file.path === file.path
                            ? null
                            : { file, x: e.clientX, y: e.clientY }
                        );
                      }}
                      className="rounded p-1 text-[#555] opacity-0 group-hover:opacity-100 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── Grid View ─── */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredFiles.map((file) => {
              const Icon = file.isFolder ? FolderOpen : getFileIcon(file.name, file.mimetype);
              const color = file.isFolder ? "text-[#F5C542]" : getFileColor(file.mimetype);
              return (
                <button
                  key={file.path}
                  onClick={() =>
                    file.isFolder ? navigateTo(file.path) : handleDownload(file.path)
                  }
                  className={`group flex flex-col items-center rounded-xl border border-[#1a1a1a] bg-[#111] p-5 transition-all hover:border-[#333] hover:bg-[#141414] ${
                    selected.has(file.path) ? "border-[#4FC3F7] bg-[#4FC3F710]" : ""
                  }`}
                >
                  <Icon className={`h-10 w-10 ${color}`} />
                  <span className="mt-3 w-full truncate text-center text-sm text-white">
                    {file.name}
                  </span>
                  <span className="mt-1 text-xs text-[#9ca3af]">
                    {file.isFolder ? "Folder" : formatBytes(file.size)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-[#333] bg-[#111] py-1 shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {!contextMenu.file.isFolder && (
            <button
              onClick={() => { handleDownload(contextMenu.file.path); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#1a1a1a]"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
          <button
            onClick={() => { handleDelete(contextMenu.file.path, contextMenu.file.name); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
