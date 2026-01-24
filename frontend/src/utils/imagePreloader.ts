/**
 * Image Preloader Utility
 * Efficiently preloads battle images for smooth animations
 */

interface PreloadOptions {
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: () => void;
  onError?: (failedUrls: string[]) => void;
}

export class ImagePreloader {
  private cache = new Map<string, boolean>();
  private loadingPromises = new Map<string, Promise<boolean>>();

  /**
   * Preload a single image
   */
  async preloadImage(url: string): Promise<boolean> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = new Promise<boolean>((resolve) => {
      const img = new Image();

      img.onload = () => {
        this.cache.set(url, true);
        resolve(true);
      };

      img.onerror = () => {
        this.cache.set(url, false);
        console.warn(`Failed to preload image: ${url}`);
        resolve(false);
      };

      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    const result = await promise;
    this.loadingPromises.delete(url);

    return result;
  }

  /**
   * Preload multiple images with progress tracking
   */
  async preloadImages(urls: string[], options: PreloadOptions = {}): Promise<string[]> {
    const { onProgress, onComplete, onError } = options;
    const failedUrls: string[] = [];
    let loaded = 0;

    const promises = urls.map(async (url) => {
      const success = await this.preloadImage(url);
      loaded++;

      if (!success) {
        failedUrls.push(url);
      }

      onProgress?.(loaded, urls.length);
      return success ? url : null;
    });

    const results = await Promise.all(promises);
    const successfulUrls = results.filter(Boolean) as string[];

    if (failedUrls.length > 0) {
      onError?.(failedUrls);
    }

    onComplete?.();
    return successfulUrls;
  }

  /**
   * Check if an image is already cached
   */
  isImageCached(url: string): boolean {
    return this.cache.get(url) === true;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cache.size;
    const successful = Array.from(this.cache.values()).filter(Boolean).length;
    const failed = total - successful;

    return { total, successful, failed };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Global preloader instance
export const imagePreloader = new ImagePreloader();

import { type TeamCharacter } from '@/data/teamBattleSystem';

/**
 * Preload all battle images for a character pair
 */
export async function preloadBattleImages(
  fighter1: TeamCharacter,
  fighter2: TeamCharacter,
  options: PreloadOptions = {}
): Promise<void> {
  const { getAvailableBattleImages } = await import('./battleImageMapper');
  const imageUrls = getAvailableBattleImages(fighter1, fighter2);

  if (imageUrls.length === 0) {
    console.warn(`No battle images found for ${fighter1.id} vs ${fighter2.id}`);
    return;
  }

  await imagePreloader.preloadImages(imageUrls, options);
}

/**
 * Preload battle images for multiple character combinations
 */
export async function preloadMultipleBattleImages(
  combinations: Array<{ fighter1: TeamCharacter; fighter2: TeamCharacter }>,
  options: PreloadOptions = {}
): Promise<void> {
  const { getAvailableBattleImages } = await import('./battleImageMapper');
  const allImageUrls: string[] = [];

  // Collect all unique image URLs
  const urlSet = new Set<string>();
  for (const { fighter1, fighter2 } of combinations) {
    const imageUrls = getAvailableBattleImages(fighter1, fighter2);
    imageUrls.forEach(url => urlSet.add(url));
  }

  allImageUrls.push(...Array.from(urlSet));

  if (allImageUrls.length === 0) {
    console.warn('No battle images found for any combinations');
    return;
  }

  await imagePreloader.preloadImages(allImageUrls, options);
}