export interface StorageService {
  get<T>(keys: string | string[] | null): Promise<T>;
  set(items: { [key: string]: unknown }): Promise<void>;
  // Add other methods if needed, e.g., remove, clear
}

export class ChromeLocalStorage implements StorageService {
  get<T>(keys: string | string[] | null): Promise<T> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (items) => {
        resolve(items as T);
      });
    });
  }

  set(items: { [key: string]: unknown }): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  }
}

export class InMemoryStorage implements StorageService {
  private store: { [key: string]: unknown } = {};

  async get<T>(keys: string | string[] | null): Promise<T> {
    if (keys === null) {
      return { ...this.store } as T;
    }
    if (typeof keys === "string") {
      return { [keys]: this.store[keys] } as T;
    }
    if (Array.isArray(keys)) {
      const result: { [key: string]: unknown } = {};
      keys.forEach((key) => {
        result[key] = this.store[key];
      });
      return result as T;
    }
    // Object query is not supported in this simple mock for now
    return {} as T;
  }

  async set(items: { [key: string]: unknown }): Promise<void> {
    Object.assign(this.store, items);
  }
}
