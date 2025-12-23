// 🔴 CRITICAL: Theme Provider Component - Dark Mode & Responsive Design
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Moon, 
  Sun, 
  Monitor, 
  Smartphone, 
  Tablet as TabletIcon, 
  Laptop,
  Settings,
  Palette
} from 'lucide-react';

// Theme Types
export type Theme = 'light' | 'dark' | 'system';
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  breakpoint: Breakpoint;
  isDark: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
}

// Create Theme Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider Component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider = React.memo<ThemeProviderProps>(({
  children,
  defaultTheme = 'system',
  storageKey = 'mimiverse-theme'
}) => {
  // State Management
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  // Detect System Theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateSystemTheme = (e: any) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Initial detection
    updateSystemTheme(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', updateSystemTheme);
    
    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme);
    };
  }, []);

  // Detect Breakpoint
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 768) {
        setBreakpoint('tablet');
      } else if (width < 1024) {
        setBreakpoint('desktop');
      } else {
        setBreakpoint('wide');
      }
    };

    // Initial detection
    updateBreakpoint();
    
    // Listen for resize
    window.addEventListener('resize', updateBreakpoint);
    
    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, []);

  // Load theme from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored as Theme);
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
  }, [storageKey]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    let actualTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      actualTheme = systemTheme;
    } else {
      actualTheme = theme;
    }

    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
    
    // Update CSS custom properties for better theming
    root.style.setProperty('--theme-mode', actualTheme);
  }, [theme, systemTheme]);

  // Save theme to storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }, [theme, storageKey]);

  // Computed values
  const isDark = theme === 'system' ? systemTheme === 'dark' : theme === 'dark';
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  const isWide = breakpoint === 'wide';

  // Theme setter with validation
  const setTheme = (newTheme: Theme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  // Context value
  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    systemTheme,
    breakpoint,
    isDark,
    isMobile,
    isTablet,
    isDesktop,
    isWide
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
});

ThemeProvider.displayName = 'ThemeProvider';

// Hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Theme Toggle Component
interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'switch';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle = React.memo<ThemeToggleProps>(({
  variant = 'button',
  showLabel = true,
  className = ''
}) => {
  const { theme, setTheme, systemTheme, isDark } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <div className="flex items-center space-x-2">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {showLabel && <span>{theme === 'system' ? 'System' : isDark ? 'Dark' : 'Light'}</span>}
          </div>
          <Settings className="h-4 w-4" />
        </Button>
        
        {/* Dropdown would go here - for simplicity using button variant */}
      </div>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
          className="relative w-12 h-6 p-0"
        >
          <div 
            className={`absolute inset-0 rounded-full transition-colors duration-200 ${
              isDark ? 'bg-primary translate-x-3' : 'bg-muted translate-x-0'
            }`}
            style={{ width: '20px', height: '20px', left: isDark ? '26px' : '2px' }}
          />
        </Button>
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  // Default button variant
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
      className={className}
    >
      <div className="flex items-center space-x-2">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {showLabel && (
          <span>
            {theme === 'system' ? 'Use System' : isDark ? 'Switch to Light' : 'Switch to Dark'}
          </span>
        )}
      </div>
    </Button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

// Responsive Component
interface ResponsiveProps {
  children: (breakpoint: Breakpoint) => React.ReactNode;
  fallback?: React.ReactNode;
}

export const Responsive = React.memo<ResponsiveProps>(({ children, fallback }) => {
  const { breakpoint } = useTheme();

  if (children) {
    return <>{children(breakpoint)}</>;
  }

  return <>{fallback || null}</>;
});

Responsive.displayName = 'Responsive';

// Breakpoint-specific components
interface BreakpointComponentProps {
  children: React.ReactNode;
  className?: string;
}

export const Mobile = React.memo<BreakpointComponentProps>(({ children, className }) => {
  const { breakpoint } = useTheme();
  return breakpoint === 'mobile' ? (
    <div className={className}>{children}</div>
  ) : null;
});

Mobile.displayName = 'Mobile';

export const Tablet = React.memo<BreakpointComponentProps>(({ children, className }) => {
  const { breakpoint } = useTheme();
  return breakpoint === 'tablet' ? (
    <div className={className}>{children}</div>
  ) : null;
});

Tablet.displayName = 'Tablet';

export const Desktop = React.memo<BreakpointComponentProps>(({ children, className }) => {
  const { breakpoint } = useTheme();
  return breakpoint === 'desktop' ? (
    <div className={className}>{children}</div>
  ) : null;
});

Desktop.displayName = 'Desktop';

export const Wide = React.memo<BreakpointComponentProps>(({ children, className }) => {
  const { breakpoint } = useTheme();
  return breakpoint === 'wide' ? (
    <div className={className}>{children}</div>
  ) : null;
});

Wide.displayName = 'Wide';

// Hook for responsive utilities
export const useResponsive = () => {
  const { breakpoint } = useTheme();
  
  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint === 'wide',
    isMobileOrTablet: breakpoint === 'mobile' || breakpoint === 'tablet',
    isDesktopOrWider: breakpoint === 'desktop' || breakpoint === 'wide',
    breakpoint
  };
};

// Theme utilities
export const themeUtils = {
  // Get theme-aware class names
  getClasses: (lightClass: string, darkClass: string, baseClass = '') => {
    return `${baseClass} ${baseClass}--light ${lightClass} ${baseClass}--dark ${darkClass}`.trim();
  },
  
  // Get theme-aware values
  getValue: (lightValue: any, darkValue: any, systemValue?: any) => {
    return {
      light: lightValue,
      dark: darkValue,
      system: systemValue || lightValue
    };
  },
  
  // CSS custom properties for theming
  cssVars: {
    '--background': 'var(--background)',
    '--foreground': 'var(--foreground)',
    '--muted': 'var(--muted)',
    '--muted-foreground': 'var(--muted-foreground)',
    '--border': 'var(--border)',
    '--input': 'var(--input)',
    '--ring': 'var(--ring)',
    '--radius': 'var(--radius)',
    '--primary': 'var(--primary)',
    '--primary-foreground': 'var(--primary-foreground)',
    '--secondary': 'var(--secondary)',
    '--secondary-foreground': 'var(--secondary-foreground)',
    '--destructive': 'var(--destructive)',
    '--destructive-foreground': 'var(--destructive-foreground)'
  } as const
};

export default ThemeProvider;
