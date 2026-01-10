import { ChromeLocalStorage, StorageService } from "../storage";

console.log("Background service worker started");

export interface BookmarkStats {
  [url: string]: number;
}

// Global instance but can be swapped for testing if we structure correctly
// For now, we instantiate the default one.
const storageService: StorageService = new ChromeLocalStorage();

// Helper to normalize URL: remove protocol and www.
const normalizeUrl = (url: string): string => {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
};

// Find bookmarks where the visited URL starts with the bookmark URL (normalized)
const getBookmarkedItems = async (
  visitedUrl: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(visitedUrl);
      const hostname = urlObj.hostname;

      // Search by hostname first to narrow down candidates efficiently
      chrome.bookmarks.search({ query: hostname }, (results) => {
        const normalizedVisited = normalizeUrl(visitedUrl);

        const matched = results.filter((bookmark) => {
          if (!bookmark.url) return false;
          const normalizedBookmark = normalizeUrl(bookmark.url);
          // Check if visited URL starts with bookmark URL (after normalization)
          return normalizedVisited.startsWith(normalizedBookmark);
        });

        resolve(matched);
      });
    } catch (e) {
      // Invalid URL passed
      console.error("Invalid URL:", visitedUrl, e);
      resolve([]);
    }
  });
};

export const incrementCounter = async (
  url: string,
  storage: StorageService = storageService
) => {
  const items = await getBookmarkedItems(url);
  if (items.length > 0) {
    const result = await storage.get<{ stats: BookmarkStats }>(["stats"]);
    const stats = (result.stats || {}) as BookmarkStats;

    let updated = false;
    items.forEach((item) => {
      if (item.url) {
        stats[item.url] = (stats[item.url] || 0) + 1;
        updated = true;
        console.log(
          `Updated count for bookmark ${item.url} (visited ${url}): ${
            stats[item.url]
          }`
        );
      }
    });

    if (updated) {
      await storage.set({ stats });
    }
  }
};

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    incrementCounter(tab.url);
  }
});

// Sort options passed from popup
export interface SortOptions {
  sortFaviconBookmarks: boolean;
  sortFolders: boolean;
  sortFolderContents: boolean;
  sortNormalBookmarks: boolean;
}

// Recursive function to sort bookmarks
export const sortBookmarks = async (
  options: SortOptions,
  storage: StorageService = storageService
) => {
  console.log("Starting sort with options:", options);
  const result = await storage.get<{ stats: BookmarkStats }>(["stats"]);
  const stats = (result.stats || {}) as BookmarkStats;

  const processNode = async (node: chrome.bookmarks.BookmarkTreeNode) => {
    if (node.children) {
      // 1. Identify items to sort based on options
      const originalChildren = [...node.children];
      // Create a copy to determine the desired order
      const desiredOrder = [...originalChildren];

      const sortableIndices: number[] = [];

      originalChildren.forEach((child, index) => {
        let shouldSort = false;
        if (!child.url) {
          // Folder
          if (options.sortFolders) shouldSort = true;
        } else {
          // Bookmark
          if (child.title.trim() === "") {
            if (options.sortFaviconBookmarks) shouldSort = true;
          } else {
            if (options.sortNormalBookmarks) shouldSort = true;
          }
        }

        if (shouldSort) {
          sortableIndices.push(index);
        }
      });

      // Helper to calculate total clicks for a folder recursively
      const getFolderScore = (
        folderNode: chrome.bookmarks.BookmarkTreeNode
      ): number => {
        let score = 0;
        const traverse = (node: chrome.bookmarks.BookmarkTreeNode) => {
          if (node.url) {
            score += stats[node.url] || 0;
          }
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(folderNode);
        return score;
      };

      const getScore = (node: chrome.bookmarks.BookmarkTreeNode): number => {
        if (!node.url) {
          return getFolderScore(node);
        }
        return stats[node.url] || 0;
      };

      if (sortableIndices.length > 1) {
        const items = sortableIndices.map((i) => originalChildren[i]);

        const itemsWithScore = items.map((item) => ({
          item,
          score: getScore(item),
        }));

        itemsWithScore.sort((a, b) => b.score - a.score);

        const sortedItems = itemsWithScore.map((x) => x.item);

        for (let k = 0; k < sortableIndices.length; k++) {
          desiredOrder[sortableIndices[k]] = sortedItems[k];
        }
      }

      // 4. Apply moves to match desiredOrder
      const currentIds = originalChildren.map((c) => c.id);

      for (let i = 0; i < desiredOrder.length; i++) {
        const targetId = desiredOrder[i].id;

        if (currentIds[i] !== targetId) {
          const currentIndex = currentIds.indexOf(targetId);
          if (currentIndex === -1) {
            console.error(`Sort error: ID ${targetId} lost during sort.`);
            continue;
          }

          try {
            if (node.id !== "0") {
              // Move item to index i
              await chrome.bookmarks.move(targetId, { index: i });
            }
          } catch (e) {
            console.error(`Move failed`, e);
          }

          // Update local model
          const [movedItem] = currentIds.splice(currentIndex, 1);
          currentIds.splice(i, 0, movedItem);
        }
      }

      // Recurse for folders
      for (const child of node.children) {
        if (!child.url) {
          // It is a folder
          // Recurse only if we are at the root (to reach Bookmark Bar/Other)
          // or if sortFolderContents option is enabled
          if (node.id === "0" || options.sortFolderContents) {
            await processNode(child);
          }
        }
      }
    }
  };

  const traverseTree = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    nodes.forEach((node) => processNode(node));
  };

  // Since getFolderScore might be expensive, we could optimize by caching or strictly controlling when it runs.
  // For now, simple implementation.
  // We need to fetch the full tree WITH children to calculate scores correctly.
  // chrome.bookmarks.getTree returns the full tree.

  chrome.bookmarks.getTree((tree) => {
    traverseTree(tree);
    console.log("Sort complete");
  });
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.command === "sort") {
    const options = message.options as SortOptions;
    sortBookmarks(options).then(() => sendResponse({ status: "done" }));
    return true; // Keep channel open for async response
  }
  return false;
});

chrome.bookmarks.onCreated.addListener(() => {
  console.log("Bookmark created");
});
