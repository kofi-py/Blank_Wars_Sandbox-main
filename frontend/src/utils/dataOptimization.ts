/**
 * Data optimization utilities for large data structures
 * Implements lazy loading, caching, and virtualization patterns
 */

// Cache for loaded data to prevent redundant operations
const dataCache = new Map<string, any>();
const indexCache = new Map<string, Map<string, any>>();

// Lazy loading wrapper
export function createLazyLoader<T>(
  loader: () => Promise<T> | T,
  cache_key: string
): () => Promise<T> {
  return async () => {
    if (dataCache.has(cache_key)) {
      return dataCache.get(cache_key);
    }
    
    const data = await loader();
    dataCache.set(cache_key, data);
    return data;
  };
}

// Create indexed access for O(1) lookups instead of O(n) array searches
export function createIndexedAccess<T extends { id: string }>(
  data: T[],
  cache_key: string
): {
  get_by_id: (id: string) => T | undefined;
  get_by_ids: (ids: string[]) => T[];
  search: (predicate: (item: T) => boolean) => T[];
  get_all: () => T[];
} {
  let index = indexCache.get(cache_key);
  
  if (!index) {
    index = new Map();
    data.forEach(item => index!.set(item.id, item));
    indexCache.set(cache_key, index);
  }
  
  return {
    get_by_id: (id: string) => index!.get(id),
    get_by_ids: (ids: string[]) => ids.map(id => index!.get(id)).filter(Boolean) as T[],
    search: (predicate: (item: T) => boolean) => data.filter(predicate),
    get_all: () => data
  };
}

// Virtual scrolling helper for large lists
export function createVirtualizedList<T>(
  items: T[],
  viewport_height: number,
  item_height: number
) {
  const visibleCount = Math.ceil(viewport_height / item_height);
  const bufferSize = Math.max(5, Math.floor(visibleCount * 0.5));
  
  return {
    get_visible_items: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / item_height);
      const bufferedStart = Math.max(0, startIndex - bufferSize);
      const bufferedEnd = Math.min(items.length, startIndex + visibleCount + bufferSize);
      
      return {
        items: items.slice(bufferedStart, bufferedEnd),
        start_index: bufferedStart,
        end_index: bufferedEnd,
        total_height: items.length * item_height,
        offset_y: bufferedStart * item_height
      };
    },
    get_total_height: () => items.length * item_height,
    get_item_count: () => items.length
  };
}

// Chunk processing for large datasets
export function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => R[],
  chunk_size: number = 50
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let currentIndex = 0;
    
    function processNextChunk() {
      const chunk = items.slice(currentIndex, currentIndex + chunk_size);
      if (chunk.length === 0) {
        resolve(results);
        return;
      }
      
      const chunkResults = processor(chunk);
      results.push(...chunkResults);
      currentIndex += chunk_size;
      
      // Use setTimeout to yield control and prevent blocking
      setTimeout(processNextChunk, 0);
    }
    
    processNextChunk();
  });
}

// Memoization for expensive calculations
export function memoize<T extends any[], R>(
  fn: (...args: T) => R,
  key_generator?: (...args: T) => string
): (...args: T) => R {
  const cache = new Map<string, R>();
  
  return (...args: T): R => {
    const key = key_generator ? key_generator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Debounced search for large datasets
export function createDebouncedSearch<T>(
  search_fn: (query: string) => T[],
  debounce_ms: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResults: T[] = [];
  
  return {
    search: (query: string): Promise<T[]> => {
      return new Promise((resolve) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (query.trim() === '') {
          lastResults = [];
          resolve(lastResults);
          return;
        }
        
        timeoutId = setTimeout(() => {
          lastResults = search_fn(query);
          resolve(lastResults);
        }, debounce_ms);
      });
    },
    get_last_results: () => lastResults,
    clear_results: () => {
      lastResults = [];
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };
}

// Clear caches to free memory
export function clearDataCaches() {
  dataCache.clear();
  indexCache.clear();
}