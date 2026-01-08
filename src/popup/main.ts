console.log("Popup script loaded");

const optionIds = [
  "sortFaviconBookmarks",
  "sortFolders",
  "sortFolderContents",
  "sortNormalBookmarks",
];

// Load options
chrome.storage.sync.get(optionIds, (items) => {
  optionIds.forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) {
      el.checked = !!items[id]; // Default false
      el.addEventListener("change", () => {
        chrome.storage.sync.set({ [id]: el.checked });
      });
    }
  });
});

document.getElementById("sort-btn")?.addEventListener("click", () => {
  console.log("Sort button clicked");

  const options: Record<string, boolean> = {};
  optionIds.forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) options[id] = el.checked;
  });

  chrome.runtime.sendMessage({ command: "sort", options }, (response) => {
    console.log("Sort response:", response);
  });
});
