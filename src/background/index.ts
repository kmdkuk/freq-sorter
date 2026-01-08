console.log('Background service worker started');

interface BookmarkStats {
  [url: string]: number;
}

// Helper to normalize URL if needed, currently using raw string match for simplicity
// and rely on chrome.bookmarks.search to handle matching
const getBookmarkedItems = async (url: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve) => {
    chrome.bookmarks.search({ url }, (results) => {
      resolve(results);
    });
  });
};

const incrementCounter = async (url: string) => {
  const items = await getBookmarkedItems(url);
  if (items.length > 0) {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = (result.stats || {}) as BookmarkStats;
      stats[url] = (stats[url] || 0) + 1;
      chrome.storage.local.set({ stats });
      console.log(`Updated count for ${url}: ${stats[url]}`);
    });
  }
};

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    incrementCounter(tab.url);
  }
});

// Recursive function to sort bookmarks
const sortBookmarks = async () => {
  console.log('Starting sort...');
  const result = await chrome.storage.local.get(['stats']);
  const stats = (result.stats || {}) as BookmarkStats;

  const processNode = async (node: chrome.bookmarks.BookmarkTreeNode) => {
    if (node.children) {
      // 1. Identify items to sort: Bookmarks with empty title
      const originalChildren = [...node.children];
      const sortableIndices: number[] = [];
      const sortableItems: chrome.bookmarks.BookmarkTreeNode[] = [];

      originalChildren.forEach((child, index) => {
        // Condition: Is bookmark (has URL) AND title is empty (whitespace trimmed)
         if (child.url && child.title.trim() === '') {
           sortableIndices.push(index);
           sortableItems.push(child);
         }
      });

      if (sortableItems.length > 1) {
        // 2. Sort the subset
        sortableItems.sort((a, b) => {
          const countA = (a.url && stats[a.url]) || 0;
          const countB = (b.url && stats[b.url]) || 0;
          return countB - countA; // Descending
        });

        // 3. Create the target new order locally to determine moves
        // We start with a copy of original children
        const desiredOrder = [...originalChildren];
        // Place sorted items back into their reserved indices
        for (let k = 0; k < sortableIndices.length; k++) {
          const targetIndex = sortableIndices[k];
          desiredOrder[targetIndex] = sortableItems[k];
        }

        // 4. Apply moves
        // Strategy: Iterate through the desired order.
        // If the item currently at index 'i' is NOT what we expect (desiredOrder[i]),
        // then we find where desiredOrder[i] is currently, and move it to 'i'.
        
        // We need a way to track current state because 'move' changes indices.
        // Getting children fresh from API is robust but one call per move.
        // Given typically small number of moves, maybe OK.
        // Let's implement robust approach: Re-fetch children inside the loop if we make a move?
        // OR: maintain a local model of the IDs in current order.
        
        const currentIds = originalChildren.map(c => c.id);

        for (let i = 0; i < desiredOrder.length; i++) {
          const targetId = desiredOrder[i].id;
          
          if (currentIds[i] !== targetId) {
             // Find where it is now
             const currentIndex = currentIds.indexOf(targetId);
             if (currentIndex === -1) {
                 console.error(`Sort error: ID ${targetId} lost during sort.`);
                 continue; 
             }
             
             // Move targetId to position 'i'
             try {
                if (node.id !== '0') { // Skip root just in case, though usually empty bookmarks aren't direct children of root
                    await chrome.bookmarks.move(targetId, { index: i });
                }
             } catch (e) {
                 console.error(`Move failed`, e);
             }

             // Update local model
             // We removed item at currentIndex and inserted at i
             const [movedItem] = currentIds.splice(currentIndex, 1);
             currentIds.splice(i, 0, movedItem);
          }
        }
      }

      // Recurse for folders
      for (const child of node.children) {
        if (!child.url) { // It is a folder
          await processNode(child);
        }
      }
    }
  };

  const traverseTree = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      nodes.forEach(node => processNode(node));
  };
    
  chrome.bookmarks.getTree((tree) => {
      traverseTree(tree);
      console.log('Sort complete');
  });
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.command === 'sort') {
    sortBookmarks().then(() => sendResponse({ status: 'done' }));
    return true; // Keep channel open for async response
  }
  return false;
});


chrome.bookmarks.onCreated.addListener(() => {
  console.log('Bookmark created');
});
