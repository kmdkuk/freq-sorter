console.log("Background service worker started");

interface BookmarkStats {
  [url: string]: number;
}

// Helper to normalize URL if needed, currently using raw string match for simplicity
// and rely on chrome.bookmarks.search to handle matching
const getBookmarkedItems = async (
  url: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve) => {
    chrome.bookmarks.search({ url }, (results) => {
      resolve(results);
    });
  });
};

const incrementCounter = async (url: string) => {
  const items = await getBookmarkedItems(url);
  if (items.length > 0) {
    chrome.storage.local.get(["stats"], (result) => {
      const stats = (result.stats || {}) as BookmarkStats;
      stats[url] = (stats[url] || 0) + 1;
      chrome.storage.local.set({ stats });
      console.log(`Updated count for ${url}: ${stats[url]}`);
    });
  }
};

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    incrementCounter(tab.url);
  }
});

// Sort options passed from popup
interface SortOptions {
  sortFaviconBookmarks: boolean;
  sortFolders: boolean;
  sortFolderContents: boolean;
  sortNormalBookmarks: boolean;
}

// Recursive function to sort bookmarks
const sortBookmarks = async (options: SortOptions) => {
  console.log("Starting sort with options:", options);
  const result = await chrome.storage.local.get(["stats"]);
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
