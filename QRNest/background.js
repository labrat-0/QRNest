// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for links
  chrome.contextMenus.create({
    id: "generate-qr-for-link",
    title: "Generate QR code for this link",
    contexts: ["link"]
  });

  // Context menu for page
  chrome.contextMenus.create({
    id: "generate-qr-for-page",
    title: "Generate QR code for this page",
    contexts: ["page"]
  });

  // Context menu for selection
  chrome.contextMenus.create({
    id: "generate-qr-for-selection",
    title: "Generate QR code for selected text",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "generate-qr-for-link":
      openPopupWithData({ type: "url", data: info.linkUrl });
      break;
    case "generate-qr-for-page":
      openPopupWithData({ type: "url", data: info.pageUrl });
      break;
    case "generate-qr-for-selection":
      openPopupWithData({ type: "text", data: info.selectionText });
      break;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "generate-qr-current-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        openPopupWithData({ type: "url", data: tabs[0].url });
      }
    });
  }
});

// Helper function to open popup with data
function openPopupWithData(data) {
  // Store data in temporary storage
  chrome.storage.local.set({ tempQRData: data }, () => {
    // Open the popup programmatically
    chrome.action.openPopup();
  });
} 