import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryStorage } from "../storage";

// Must be hoisted or defined before imports that use it if we were mocking modules,
// but here we are stubbing the global.
const chromeMock = {
  bookmarks: {
    search: vi.fn(),
    move: vi.fn(),
    getTree: vi.fn(),
    onCreated: { addListener: vi.fn() },
  },
  tabs: {
    onUpdated: { addListener: vi.fn() },
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};
vi.stubGlobal("chrome", chromeMock);

// Import after stubbing to ensure top-level code uses the stub if any (though we tried to minimize side effects)
// import { incrementCounter, sortBookmarks, SortOptions } from "./index"; // Removed static import

describe("Background Logic", () => {
  let storage: InMemoryStorage;
  let incrementCounter: any;
  let sortBookmarks: any;
  // let SortOptions: any; // Types are erased at runtime so we don't import them dynamically for usage, just for type hints if needed but here we use any or defined interface locally if strictly needed.

  beforeEach(async () => {
    vi.resetAllMocks();
    storage = new InMemoryStorage();

    // Dynamic import to ensure chrome is mocked before evaluation
    const module = await import("./index");
    incrementCounter = module.incrementCounter;
    sortBookmarks = module.sortBookmarks;
  });

  describe("incrementCounter", () => {
    it("should increment count for existing bookmark", async () => {
      const url = "https://example.invalid";

      // Mock bookmarks.search to return a result (meaning it IS bookmarked)
      chromeMock.bookmarks.search.mockImplementation((_query, callback) => {
        callback([{ id: "1", title: "Example", url }]);
      });

      await incrementCounter(url, storage);

      const stats = await storage.get<{ stats: Record<string, number> }>([
        "stats",
      ]);
      expect(stats.stats).toEqual({ [url]: 1 });

      // Increment again
      await incrementCounter(url, storage);
      const stats2 = await storage.get<{ stats: Record<string, number> }>([
        "stats",
      ]);
      expect(stats2.stats).toEqual({ [url]: 2 });
    });

    it("should not increment count if not bookmarked", async () => {
      const url = "https://not-bookmarked.invalid";

      // Mock bookmarks.search to return empty
      chromeMock.bookmarks.search.mockImplementation((_query, callback) => {
        callback([]);
      });

      await incrementCounter(url, storage);

      const stats = await storage.get<{ stats: Record<string, number> }>([
        "stats",
      ]);
      expect(stats.stats).toBeUndefined(); // Or empty depending on how get works for missing keys
    });
  });

  describe("sortBookmarks", () => {
    it("should sort bookmarks based on count (Normal Bookmarks)", async () => {
      const folderId = "1";
      const children = [
        { id: "10", title: "Low Count", url: "https://low.invalid" },
        { id: "11", title: "High Count", url: "https://high.invalid" },
      ];

      // Setup stats
      await storage.set({
        stats: {
          "https://low.invalid": 1,
          "https://high.invalid": 10,
        },
      });

      const rootNode = {
        id: "0",
        children: [
          {
            id: folderId,
            children: children,
          },
        ],
      };

      chromeMock.bookmarks.getTree.mockImplementation((callback) => {
        callback([rootNode]);
      });

      const options = {
        // Removed SortOptions type annotation
        sortFaviconBookmarks: false,
        sortFolders: false,
        sortFolderContents: false,
        sortNormalBookmarks: true,
      };

      await sortBookmarks(options, storage);

      // Expect 'High Count' (index 1) to be moved to index 0
      // The logic:
      // 1. Calculate scores: High=10, Low=1
      // 2. Sort: High, Low
      // 3. Desired order: [High, Low]
      // 4. Current order: [Low, High]
      // High is at known index 1. Desired index 0.
      // Move(11, {index: 0})

      expect(chromeMock.bookmarks.move).toHaveBeenCalled();
      // We can check specific calls.
      // The logic compares desired vs current.
      // Desired[0] is High (id 11). Current[0] is Low (id 10).
      // It sees mismatch. Finds High at index 1.
      // Moves High to index 0.
      expect(chromeMock.bookmarks.move).toHaveBeenCalledWith("11", {
        index: 0,
      });
    });

    it("should only sort specified types and leave others untouched (Mixed Content)", async () => {
      // [Bookmark A (1), Folder C (100), Bookmark B (10)]
      // sortNormalBookmarks: true, sortFolders: false
      // Expected: [Bookmark B, Folder C, Bookmark A]
      const children = [
        { id: "101", title: "Bookmark A", url: "https://a.invalid" },
        { id: "102", title: "Folder C", children: [] }, // No url -> Folder
        { id: "103", title: "Bookmark B", url: "https://b.invalid" },
      ];

      await storage.set({
        stats: {
          "https://a.invalid": 1,
          "https://b.invalid": 10,
        },
      });

      const rootNode = {
        id: "0",
        children: [
          {
            id: "1",
            children: children,
          },
        ],
      };

      chromeMock.bookmarks.getTree.mockImplementation((callback) => {
        callback([rootNode]);
      });

      const options = {
        sortFaviconBookmarks: false,
        sortFolders: false,
        sortFolderContents: false,
        sortNormalBookmarks: true,
      };

      await sortBookmarks(options, storage);

      // Logic:
      // Sortable indices: 0 (A), 2 (B).
      // Items to sort: A(1), B(10).
      // Sorted: B, A.
      // Desired Order:
      // Index 0: B
      // Index 1: Folder C (Untouched)
      // Index 2: A

      // Current IDs: 101, 102, 103.
      // Desired IDs: 103, 102, 101.

      // Moves:
      // i=0: Desired 103. Current 101.
      // Move 103 to index 0.
      expect(chromeMock.bookmarks.move).toHaveBeenCalledWith("103", {
        index: 0,
      });

      // Note: In a real run, the array would be mutated.
      // Our mock doesn't mutate the array passed to getTree,
      // but the logic calculates moves based on the initial snapshot.
      // The second move might be redundant or calculated based on indices.
      // Let's verify at least the primary sort action happened.
    });

    it("should NOT sort folder contents when sortFolderContents is false", async () => {
      // Root -> Bar (1) -> Folder A (100) -> [Bookmark Low (1), Bookmark High (10)]
      // sortNormalBookmarks: true, sortFolderContents: false
      // We expect Low and High inside Folder A NOT to swap.

      const folderAChildren = [
        { id: "201", title: "Low", url: "https://low.invalid" },
        { id: "202", title: "High", url: "https://high.invalid" },
      ];

      const barChildren = [
        { id: "100", title: "Folder A", children: folderAChildren },
      ];

      await storage.set({
        stats: {
          "https://low.invalid": 1,
          "https://high.invalid": 10,
        },
      });

      const rootNode = {
        id: "0",
        children: [
          {
            id: "1",
            children: barChildren,
          },
        ],
      };

      chromeMock.bookmarks.getTree.mockImplementation((callback) => {
        callback([rootNode]);
      });

      const options = {
        sortFaviconBookmarks: false,
        sortFolders: false,
        sortFolderContents: false, // Key flag
        sortNormalBookmarks: true,
      };

      // Reset mocks to be sure
      chromeMock.bookmarks.move.mockClear();

      await sortBookmarks(options, storage);

      // Should NOT verify children of Folder A (id 100).
      // Logic:
      // processNode(Root) -> recursive to Bar (1).
      // processNode(Bar) -> check Folder A. sortFolders=false -> no sort of Folder A.
      // recursion loop:
      // child is Folder A. node.id="1".
      // if ("1" === "0" || options.sortFolderContents) -> false.
      // Does NOT recurse into Folder A.

      // Thus, no moves should occur for 201 or 202.
      expect(chromeMock.bookmarks.move).not.toHaveBeenCalled();
    });

    it("should sort folder contents when sortFolderContents is TRUE", async () => {
      // Same setup, but true.
      const folderAChildren = [
        { id: "201", title: "Low", url: "https://low.invalid" },
        { id: "202", title: "High", url: "https://high.invalid" },
      ];

      const barChildren = [
        { id: "100", title: "Folder A", children: folderAChildren },
      ];

      await storage.set({
        stats: {
          "https://low.invalid": 1,
          "https://high.invalid": 10,
        },
      });

      const rootNode = {
        id: "0",
        children: [
          {
            id: "1",
            children: barChildren,
          },
        ],
      };

      chromeMock.bookmarks.getTree.mockImplementation((callback) => {
        callback([rootNode]);
      });

      const options = {
        sortFaviconBookmarks: false,
        sortFolders: false,
        sortFolderContents: true, // Key flag
        sortNormalBookmarks: true,
      };

      chromeMock.bookmarks.move.mockClear();

      await sortBookmarks(options, storage);

      // Should recurse.
      // High (202) should move to index 0 of Folder A.
      expect(chromeMock.bookmarks.move).toHaveBeenCalledWith("202", {
        index: 0,
      });
    });
  });
});
