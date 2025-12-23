import { RefreshCw, ExternalLink, Globe, Smartphone, Tablet, Monitor, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface DevServerStatus {
  running: boolean;
  port?: number;
  url?: string;
}

export function Preview() {
  const [status, setStatus] = useState<DevServerStatus>({ running: false });
  const [loading, setLoading] = useState(true);
  const [previewWidth, setPreviewWidth] = useState<string>("100%");

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/preview/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      setStatus({ running: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;
    checkStatus();
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-[hsl(var(--sidebar-border))]">
      <div className="h-9 flex items-center justify-between px-2 border-b bg-gray-100 text-gray-600">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex items-center bg-white h-6 rounded border border-gray-200 px-2 mx-2 text-xs">
            <Globe size={10} className="mr-1.5 text-gray-400" />
            <span>{status.running ? status.url : "No dev server"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-gray-900"
            onClick={handleRefresh}
          >
            <RefreshCw size={12} />
          </Button>
          <div className="w-[1px] h-3 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${previewWidth === '375px' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setPreviewWidth('375px')}
            title="Mobile (375px)"
          >
            <Smartphone size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${previewWidth === '768px' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setPreviewWidth('768px')}
            title="Tablet (768px)"
          >
            <Tablet size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${previewWidth === '100%' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setPreviewWidth('100%')}
            title="Desktop (100%)"
          >
            <Monitor size={12} />
          </Button>
          <div className="w-[1px] h-3 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-gray-900"
            onClick={() => status.running && window.open(status.url, '_blank')}
          >
            <ExternalLink size={12} />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex justify-center">
        <div
          className="h-full bg-white transition-all duration-300 ease-in-out shadow-xl"
          style={{ width: previewWidth }}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-400">Checking for dev server...</div>
            </div>
          ) : status.running ? (
            <iframe
              src="/preview/"
              className="w-full h-full border-0"
              title="Live Preview"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <Play className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Dev Server Running</h3>
              <p className="text-gray-500 mb-4">Start your development server to see live preview</p>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-700">npm run dev</code>
              <p className="text-xs text-gray-400 mt-4">Checking ports: 5173, 3000, 8080...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
