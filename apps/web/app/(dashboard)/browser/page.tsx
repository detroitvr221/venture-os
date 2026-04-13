"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2, HardDrive } from "lucide-react";

export default function FileBrowserPage() {
  const [fullscreen, setFullscreen] = useState(false);
  const FILEBROWSER_URL = "http://145.223.75.46:8080";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-[#0a0a0a]" : "h-full"}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222] bg-[#0a0a0a] px-6 py-3">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-[#4FC3F7]" />
          <div>
            <h1 className="text-lg font-bold text-white">File Browser</h1>
            <p className="text-xs text-[#9ca3af]">VPS file system — browse, upload, edit files on the server</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <a
            href={FILEBROWSER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Embedded FileBrowser */}
      <iframe
        src={FILEBROWSER_URL}
        className={fullscreen ? "h-[calc(100vh-52px)] w-full" : "h-[calc(100vh-120px)] w-full"}
        style={{ border: "none", background: "#0a0a0a" }}
        title="File Browser"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
