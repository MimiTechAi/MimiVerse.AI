import { RefreshCw, ExternalLink, Globe, Smartphone, Tablet, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Preview() {
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
            <span>localhost:5173</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-900">
            <RefreshCw size={12} />
          </Button>
          <div className="w-[1px] h-3 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-900">
            <Smartphone size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-900">
            <Tablet size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-900">
            <Monitor size={12} />
          </Button>
          <div className="w-[1px] h-3 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-900">
            <ExternalLink size={12} />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center">
        {/* Mock Content for Preview */}
        <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-[#242424] text-white">
          <div className="flex gap-8 mb-8">
            <div className="w-24 h-24 rounded-full bg-[#646cff] p-4 animate-pulse">
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" alt="Vite" className="w-full h-full" />
            </div>
            <div className="w-24 h-24 rounded-full bg-[#61dafbaa] p-4 animate-spin-slow" style={{ animationDuration: '20s' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" className="w-full h-full" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Vite + React</h1>
          <div className="bg-[#1a1a1a] p-6 rounded-lg mb-6 border border-white/10 shadow-xl">
             <button className="bg-[#1a1a1a] border border-[#646cff] text-white hover:border-[#646cff] px-4 py-2 rounded-lg font-medium transition-colors">
              count is 0
            </button>
            <p className="mt-4 text-gray-400">
              Edit <code className="bg-black/30 px-1 py-0.5 rounded font-mono">src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="text-gray-500 text-sm">
            Click on the Vite and React logos to learn more
          </p>
        </div>
      </div>
    </div>
  );
}
