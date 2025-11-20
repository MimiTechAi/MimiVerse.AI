import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Maximize2, X, ChevronDown } from 'lucide-react';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#1E1E1E',
        foreground: '#CCCCCC',
        cursor: '#FFFFFF',
        selectionBackground: '#264F78',
        black: '#000000',
        red: '#CD3131',
        green: '#0DBC79',
        yellow: '#E5E510',
        blue: '#2472C8',
        magenta: '#BC3FBC',
        cyan: '#11A8CD',
        white: '#E5E5E5',
        brightBlack: '#666666',
        brightRed: '#F14C4C',
        brightGreen: '#23D18B',
        brightYellow: '#F5F543',
        brightBlue: '#3B8EEA',
        brightMagenta: '#D670D6',
        brightCyan: '#29B8DB',
        brightWhite: '#E5E5E5',
      },
      fontFamily: "'Fira Code', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    
    fitAddon.fit();
    term.writeln('\x1b[1;32m➜\x1b[0m \x1b[1;36mproject\x1b[0m \x1b[33mgit:(main)\x1b[0m npm run dev');
    term.writeln('');
    term.writeln('  \x1b[32mVITE v5.2.0\x1b[0m  \x1b[32mready in 234 ms\x1b[0m');
    term.writeln('');
    term.writeln('  \x1b[32m➜\x1b[0m  \x1b[1mLocal\x1b[0m:   \x1b[36mhttp://localhost:5173/\x1b[0m');
    term.writeln('  \x1b[32m➜\x1b[0m  \x1b[1mNetwork\x1b[0m: use \x1b[1m--host\x1b[0m to expose');
    term.writeln('');

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Initial focus
    term.focus();

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  // Re-fit on parent resize (using ResizeObserver would be better, but window resize is okay for basic layout)
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });
    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--editor-bg))] border-t border-[hsl(var(--sidebar-border))]">
      <div className="flex items-center justify-between px-4 h-9 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-6 text-xs uppercase font-medium">
          <div className="text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--primary))] h-9 flex items-center cursor-pointer">Terminal</div>
          <div className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer">Output</div>
          <div className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer">Problems <span className="ml-1 bg-[hsl(var(--primary))] text-white rounded-full px-1.5 py-0.5 text-[10px]">0</span></div>
          <div className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer">Debug Console</div>
        </div>
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
          <Maximize2 size={14} className="cursor-pointer hover:text-[hsl(var(--foreground))]" />
          <ChevronDown size={16} className="cursor-pointer hover:text-[hsl(var(--foreground))]" />
          <X size={16} className="cursor-pointer hover:text-[hsl(var(--foreground))]" />
        </div>
      </div>
      <div className="flex-1 p-2 overflow-hidden bg-[#1E1E1E]">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
