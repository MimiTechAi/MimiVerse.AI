// 🔴 CRITICAL: Utility Functions

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for constructing className strings conditionally
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique ID for agent runs
 */
export function generateAgentId(): string {
  return generateId('agent');
}

/**
 * Generate unique ID for messages
 */
export function generateMessageId(): string {
  return generateId('msg');
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + '...';
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON safely
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if file is a code file
 */
export function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    '.py', '.java', '.cpp', '.c', '.cs', '.php',
    '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.sass', '.less'
  ];
  const ext = getFileExtension(filename).toLowerCase();
  return codeExtensions.includes(ext);
}

/**
 * Check if file is a test file
 */
export function isTestFile(filename: string): boolean {
  return filename.includes('.test.') ||
    filename.includes('.spec.') ||
    filename.includes('__tests__') ||
    filename.startsWith('test_');
}

/**
 * Get contrast color
 */
export function getContrastColor(hexColor: string): string {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * Generate color from string
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generate random color
 */
export function randomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  return !isMobile() && !isTablet();
}

/**
 * Get viewport size
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Scroll to element smoothly
 */
export function scrollToElement(element: HTMLElement, offset: number = 0): void {
  const targetY = element.offsetTop - offset;
  window.scrollTo({
    top: targetY,
    behavior: 'smooth'
  });
}

/**
 * Check if element is in viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Extract mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  return hashtags;
}

/**
 * Sanitize HTML
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escape regex special characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate slug from string
 */
export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if two arrays are equal
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Remove duplicates from array
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is object
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get nested property safely
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property safely
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Remove nested property safely
 */
export function removeNestedValue(obj: any, path: string): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = keys.reduce((current, key) => current?.[key], obj);

  if (target && target[lastKey] !== undefined) {
    delete target[lastKey];
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError!;
}

/**
 * Create promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create cancellable promise
 */
export function createCancellablePromise<T>(
  promise: Promise<T>,
  onCancel: () => void
): { promise: Promise<T>; cancel: () => void } {
  let isCancelled = false;

  const cancellablePromise = promise.then(
    result => {
      if (isCancelled) return Promise.reject(new Error('Promise cancelled'));
      return result;
    },
    error => {
      if (isCancelled) return Promise.reject(new Error('Promise cancelled'));
      throw error;
    }
  );

  return {
    promise: cancellablePromise,
    cancel: () => {
      isCancelled = true;
      onCancel();
    }
  };
}

/**
 * Check if promise is settled
 */
export function isPromiseSettled(promise: Promise<any>): Promise<boolean> {
  return Promise.race([
    promise.then(() => true),
    promise.catch(() => true),
    new Promise(resolve => setTimeout(() => false, 0))
  ]);
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  limit: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }
  return null;
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): {
  loadTime: number;
  domReady: number;
  fullyLoaded: number;
} | null {
  if (!performance.timing) return null;

  const timing = performance.timing;
  return {
    loadTime: timing.loadEventEnd - timing.navigationStart,
    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
    fullyLoaded: timing.loadEventEnd - timing.navigationStart
  };
}

/**
 * Format number with separators
 */
export function formatNumber(num: number, separator: string = ','): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Round number to specified decimals
 */
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Calculate percentage difference
 */
export function percentageDifference(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Check if number is in range
 */
export function inRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * Wrap text at specified width
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Get text width (approximation)
 */
export function getTextWidth(text: string, font: string = '16px Arial'): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;

  context.font = font;
  return context.measureText(text).width;
}

/**
 * Truncate text to fit width
 */
export function truncateTextToWidth(
  text: string,
  maxWidth: number,
  font: string = '16px Arial'
): string {
  const ellipsis = '...';
  let truncated = text;

  while (getTextWidth(truncated, font) > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }

  if (truncated.length < text.length) {
    truncated = truncated.slice(0, -ellipsis.length) + ellipsis;
  }

  return truncated;
}

/**
 * Get color intensity
 */
export function getColorIntensity(hexColor: string): number {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Lighten color
 */
export function lightenColor(hexColor: string, percent: number): string {
  const num = parseInt(hexColor.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

/**
 * Darken color
 */
export function darkenColor(hexColor: string, percent: number): string {
  return lightenColor(hexColor, -percent);
}

/**
 * Mix two colors
 */
export function mixColors(color1: string, color2: string, ratio: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert RGB to HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert HEX to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Tailwind CSS utilities
export { clsx, twMerge };
