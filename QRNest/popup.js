// Global state
let savedLinks = [];
let currentQRCode = null;
let activeTab = "url";
let customizePanelOpen = false;
let qrCodeOptions = {
  size: 200,
  foregroundColor: "#333333",
  backgroundColor: "#ffffff",
  errorCorrectionLevel: "M",
  logo: null
};
let downloadOptions = {
  format: "png",
  size: "medium"
};
let tagsList = [];

// Load saved theme preference and initialize UI
document.addEventListener('DOMContentLoaded', async () => {
  console.log("QR Nest initializing...");
  
  try {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    }
    
    console.log("Theme initialized:", savedTheme);
    
    // Initialize UI
    setupTabNavigation();
    setupCustomizePanel();
    setupDownloadOptions();
    setupSettingsButton();
    setupInputEventListeners();
    
    // Initialize color pickers (before any theme updates)
    initColorPickers();
    
    // Update theme colors after color pickers are initialized
    updateThemeColors();
    
    // Load saved links
    await loadSavedLinks();
    
    // Check for data from context menu or keyboard shortcut
    chrome.storage.local.get(['tempQRData'], (result) => {
      if (result.tempQRData) {
        const { type, data } = result.tempQRData;
        console.log("Received data from context menu:", type, data);
        
        if (type === 'url' && data) {
          document.getElementById('url').value = data;
          generateQRCode();
        } else if (type === 'text' && data) {
          // Switch to text tab
          switchTab('text');
          document.getElementById('plainText').value = data;
          generateQRCode();
        }
        
        // Clear the temporary data
        chrome.storage.local.remove(['tempQRData']);
      }
    });
    
    console.log("QR Nest initialization complete");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Set up tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-nav-item');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

// Switch between tabs
function switchTab(tabName) {
  console.log("Switching to tab:", tabName);
  
  // Update active tab state
  activeTab = tabName;
  
  // Update UI - tab buttons
  document.querySelectorAll('.tab-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  
  // Update UI - tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Tab`);
  });
  
  // If there was a previously generated QR code, clear it when switching tabs
  if (currentQRCode) {
    const container = document.getElementById('qrCodeContainer');
    if (container) {
      container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
    }
    currentQRCode = null;
    
    // Disable copy/download buttons
    document.getElementById('copyQRCode').disabled = true;
    document.getElementById('downloadQRCode').disabled = true;
  }
}

// Initialize color pickers
function initColorPickers() {
  try {
    // Check if jQuery is available
    if (typeof $ === 'undefined') {
      console.error("jQuery is not available for spectrum color picker");
      return;
    }
    
    // Check if spectrum plugin is available
    if (typeof $.fn.spectrum === 'undefined') {
      console.error("Spectrum color picker plugin not loaded");
      return;
    }
    
    $("#foregroundColor").spectrum({
      color: qrCodeOptions.foregroundColor,
      showInput: true,
      preferredFormat: "hex",
      showInitial: true,
      showPalette: true,
      showSelectionPalette: true,
      maxSelectionSize: 10,
      palette: [
        ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
        ["#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
        ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"]
      ],
      change: (color) => {
        qrCodeOptions.foregroundColor = color.toHexString();
        if (currentQRCode) {
          generateQRCode();
        }
      }
    });
    
    $("#backgroundColor").spectrum({
      color: qrCodeOptions.backgroundColor,
      showInput: true,
      preferredFormat: "hex",
      showInitial: true,
      showPalette: true,
      showSelectionPalette: true,
      maxSelectionSize: 10,
      palette: [
        ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
        ["#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
        ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"]
      ],
      change: (color) => {
        qrCodeOptions.backgroundColor = color.toHexString();
        if (currentQRCode) {
          generateQRCode();
        }
      }
    });
    
    console.log("Color pickers initialized successfully");
  } catch (error) {
    console.error("Error initializing color pickers:", error);
  }
}

// Setup customize panel
function setupCustomizePanel() {
  const customizeButton = document.getElementById('customizeQR');
  const customizePanel = document.getElementById('customizePanel');
  
  customizeButton.addEventListener('click', () => {
    customizePanelOpen = !customizePanelOpen;
    customizePanel.classList.toggle('active', customizePanelOpen);
  });
  
  // Add event listeners for customize options
  document.getElementById('errorCorrection').addEventListener('change', (e) => {
    qrCodeOptions.errorCorrectionLevel = e.target.value;
    if (currentQRCode) {
      generateQRCode();
    }
  });
  
  const qrSizeSlider = document.getElementById('qrSize');
  const qrSizeValue = document.getElementById('qrSizeValue');
  
  qrSizeSlider.addEventListener('input', (e) => {
    qrCodeOptions.size = parseInt(e.target.value);
    qrSizeValue.textContent = `${qrCodeOptions.size}px`;
    if (currentQRCode) {
      generateQRCode();
    }
  });
  
  // Logo upload
  document.getElementById('logoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          qrCodeOptions.logo = img;
          if (currentQRCode) {
            generateQRCode();
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// Setup download options dropdown
function setupDownloadOptions() {
  const downloadButton = document.getElementById('downloadQRCode');
  const downloadOptionsPanel = document.getElementById('downloadOptions');
  
  downloadButton.addEventListener('click', (event) => {
    // Position the download options panel below the download button
    const buttonRect = downloadButton.getBoundingClientRect();
    downloadOptionsPanel.style.left = `${buttonRect.left}px`;
    downloadOptionsPanel.style.top = `${buttonRect.bottom + 5}px`;
    
    // Toggle the download options panel
    downloadOptionsPanel.classList.toggle('active');
    
    event.stopPropagation();
  });
  
  // Hide download options when clicking elsewhere
  document.addEventListener('click', (event) => {
    if (!downloadOptionsPanel.contains(event.target) && event.target !== downloadButton) {
      downloadOptionsPanel.classList.remove('active');
    }
  });
  
  // Set up download format options
  document.querySelectorAll('.download-option').forEach(option => {
    option.addEventListener('click', () => {
      const format = option.getAttribute('data-format');
      downloadOptions.format = format;
      downloadQRCode();
    });
  });
  
  // Set up download size options
  document.querySelectorAll('.download-option-size').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.download-option-size').forEach(opt => {
        opt.classList.remove('active');
      });
      option.classList.add('active');
      
      const size = option.getAttribute('data-size');
      downloadOptions.size = size;
    });
  });
}

// Update theme colors for QR code
function updateThemeColors() {
  if (!$("#foregroundColor").spectrum || !$("#backgroundColor").spectrum) {
    console.error("Spectrum color picker not initialized");
    return;
  }

  try {
    const isDarkMode = document.body.classList.contains('dark');
    
    // Update foreground color
    if (isDarkMode) {
      $("#foregroundColor").spectrum("set", "#ffffff");
      qrCodeOptions.foregroundColor = "#ffffff";
    } else {
      $("#foregroundColor").spectrum("set", "#333333");
      qrCodeOptions.foregroundColor = "#333333";
    }
    
    // Update background color
    if (isDarkMode) {
      $("#backgroundColor").spectrum("set", "#2a2c30");
      qrCodeOptions.backgroundColor = "#2a2c30";
    } else {
      $("#backgroundColor").spectrum("set", "#ffffff");
      qrCodeOptions.backgroundColor = "#ffffff";
    }
    
    // If there's a QR code, regenerate it with the new theme colors
    if (currentQRCode) {
      generateQRCode();
    }
  } catch (error) {
    console.error("Error updating theme colors:", error);
  }
}

// Load saved links from storage
async function loadSavedLinks() {
  try {
    console.log("Loading saved links from local storage...");
    
    // Check if chrome storage API is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error("Chrome storage API not available");
      savedLinks = [];
      await renderSavedLinks();
      return;
    }
    
    chrome.storage.local.get(['savedLinks'], async (result) => {
      console.log("Retrieved from storage:", result);
      
      if (result.savedLinks && Array.isArray(result.savedLinks)) {
        savedLinks = result.savedLinks;
        console.log(`Loaded ${savedLinks.length} saved links`);
      } else {
        console.log("No saved links found or invalid format");
        savedLinks = [];
      }
      
      await renderSavedLinks();
    });
  } catch (error) {
    console.error("Error loading saved links:", error);
    savedLinks = [];
    await renderSavedLinks();
  }
}

// Save the current links to storage
function saveLinkToStorage() {
  try {
    console.log(`Saving ${savedLinks.length} links to local storage`);
    
    // Check if chrome storage API is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error("Chrome storage API not available");
      showNotification('Error: Unable to save links');
      return;
    }
    
    chrome.storage.local.set({ savedLinks }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving links:', chrome.runtime.lastError);
        showNotification('Error saving links: ' + chrome.runtime.lastError.message);
      } else {
        console.log("Links saved successfully");
      }
    });
  } catch (error) {
    console.error("Error in saveLinkToStorage:", error);
    showNotification('Error saving links');
  }
}

// Render saved links in the UI
async function renderSavedLinks() {
  const container = document.getElementById('savedLinksList');
  
  // Clear current content
  container.innerHTML = '';
  
  if (savedLinks.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved QR codes yet</div>';
    return;
  }
  
  // Add each saved link
  for (let i = 0; i < savedLinks.length; i++) {
    const link = savedLinks[i];
    const item = document.createElement('div');
    item.className = 'saved-link-item';
    item.draggable = true;
    
    // Set data-type attribute for CSS styling
    item.setAttribute('data-type', link.type || 'unknown');
    
    // Add drag & drop functionality
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i.toString());
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
    
    // Create thumbnail and info section
    const linkInfo = document.createElement('div');
    linkInfo.className = 'saved-link-info';
    
    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'saved-link-thumbnail';
    
    if (link.thumbnail) {
      const img = document.createElement('img');
      img.src = link.thumbnail;
      img.alt = 'QR Thumbnail';
      thumbnail.appendChild(img);
    } else {
      // Fallback icon
      const icon = document.createElement('span');
      icon.className = 'material-icons';
      
      // Select appropriate icon based on type
      switch (link.type) {
        case 'url':
          icon.textContent = 'link';
          icon.style.color = '#175DDC';
          break;
        case 'text':
          icon.textContent = 'text_fields';
          icon.style.color = '#4CAF50';
          break;
        case 'wifi':
          icon.textContent = 'wifi';
          icon.style.color = '#FF9800';
          break;
        case 'contact':
          icon.textContent = 'person';
          icon.style.color = '#9C27B0';
          break;
        case 'email':
          icon.textContent = 'email';
          icon.style.color = '#F44336';
          break;
        case 'sms':
          icon.textContent = 'sms';
          icon.style.color = '#2196F3';
          break;
        default:
          icon.textContent = 'qr_code';
          icon.style.color = '#777777';
      }
      
      thumbnail.appendChild(icon);
    }
    
    // Add type badge to the thumbnail
    const typeBadge = document.createElement('div');
    typeBadge.className = 'type-badge';
    typeBadge.textContent = link.type || 'qr';
    thumbnail.appendChild(typeBadge);
    
    // Text content
    const textContent = document.createElement('div');
    textContent.className = 'saved-link-text';
    
    const title = document.createElement('div');
    title.className = 'saved-link-title';
    title.textContent = link.title || 'QR Code';
    
    const url = document.createElement('div');
    url.className = 'saved-link-url';
    url.textContent = link.url || link.data;
    
    // Add date if available
    if (link.created) {
      const date = document.createElement('div');
      date.className = 'saved-link-date';
      date.textContent = link.created;
      url.textContent = url.textContent + ' • ' + date.textContent;
    }
    
    // Tags
    if (link.tags && link.tags.length > 0) {
      const tagContainer = document.createElement('div');
      tagContainer.className = 'tag-container';
      
      link.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagContainer.appendChild(tagElement);
      });
      
      textContent.appendChild(title);
      textContent.appendChild(url);
      textContent.appendChild(tagContainer);
    } else {
      textContent.appendChild(title);
      textContent.appendChild(url);
    }
    
    // Add drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'material-icons drag-handle';
    dragHandle.textContent = 'drag_indicator';
    
    linkInfo.appendChild(dragHandle);
    linkInfo.appendChild(thumbnail);
    linkInfo.appendChild(textContent);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'saved-link-actions';
    
    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'icon-button';
    loadBtn.title = 'Load QR Code';
    loadBtn.innerHTML = '<span class="material-icons">arrow_downward</span>';
    loadBtn.addEventListener('click', () => loadSavedLink(i));
    
    // Generate QR button
    const generateQRBtn = document.createElement('button');
    generateQRBtn.className = 'icon-button';
    generateQRBtn.title = 'Generate QR Code';
    generateQRBtn.innerHTML = '<span class="material-icons">qr_code</span>';
    generateQRBtn.addEventListener('click', () => {
      loadSavedLink(i);
      generateQRCode();
    });
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-button';
    deleteBtn.title = 'Delete QR Code';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.addEventListener('click', () => deleteSavedLink(i));
    
    actions.appendChild(loadBtn);
    actions.appendChild(generateQRBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(linkInfo);
    item.appendChild(actions);
    container.appendChild(item);
  }
  
  // Add drag and drop functionality to the container
  setupDragAndDrop(container);
}

// Set up drag and drop reordering for saved links
function setupDragAndDrop(container) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = container.querySelector('.dragging');
    if (!dragging) return;
    
    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement) {
      container.insertBefore(dragging, afterElement);
    } else {
      container.appendChild(dragging);
    }
  });
  
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(draggedIndex)) return;
    
    // Find the new position
    const items = Array.from(container.querySelectorAll('.saved-link-item'));
    const newIndex = items.indexOf(container.querySelector('.dragging'));
    
    // Reorder the array
    const [removed] = savedLinks.splice(draggedIndex, 1);
    savedLinks.splice(newIndex, 0, removed);
    
    // Save the new order
    saveLinkToStorage();
    
    // Re-render (optional, could just remove the dragging class)
    renderSavedLinks();
  });
}

// Helper function for drag and drop ordering
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.saved-link-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Render tags
function renderTags() {
  const container = document.getElementById('tagsContainer');
  if (!container) return;
  
  // Clear current tags
  container.innerHTML = '';
  
  // Add each tag
  tagsList.forEach((tag, index) => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    
    const removeIcon = document.createElement('span');
    removeIcon.className = 'material-icons';
    removeIcon.textContent = 'close';
    removeIcon.addEventListener('click', () => {
      tagsList.splice(index, 1);
      renderTags();
    });
    
    tagElement.appendChild(removeIcon);
    container.appendChild(tagElement);
  });
  
  // Add input field for new tags
  const inputContainer = document.createElement('span');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tag-input';
  input.placeholder = 'Add tag';
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      if (!tagsList.includes(input.value.trim())) {
        tagsList.push(input.value.trim());
        renderTags();
      }
      input.value = '';
    }
  });
  
  inputContainer.appendChild(input);
  container.appendChild(inputContainer);
}

// Search saved QR codes
function searchSavedLinks(query) {
  if (!query) {
    renderSavedLinks();
    return;
  }
  
  const queryLower = query.toLowerCase();
  const filteredLinks = savedLinks.filter(link => {
    const title = (link.title || '').toLowerCase();
    const url = (link.url || '').toLowerCase();
    const data = (link.data || '').toLowerCase();
    const type = (link.type || '').toLowerCase();
    const tags = (link.tags || []).map(tag => tag.toLowerCase());
    
    return (
      title.includes(queryLower) ||
      url.includes(queryLower) ||
      data.includes(queryLower) ||
      type.includes(queryLower) ||
      tags.some(tag => tag.includes(queryLower))
    );
  });
  
  // Temporary override savedLinks for rendering
  const originalLinks = [...savedLinks];
  savedLinks = filteredLinks;
  renderSavedLinks();
  savedLinks = originalLinks;
}

// Load a saved link into the form
function loadSavedLink(index) {
  const link = savedLinks[index];
  if (!link) return;
  
  // Switch to the appropriate tab
  switchTab(link.type || 'url');
  
  // Set the form values based on the link type
  switch (link.type) {
    case 'url':
      document.getElementById('url').value = link.url || '';
      break;
    case 'text':
      document.getElementById('plainText').value = link.data || '';
      break;
    case 'wifi':
      // Parse WIFI string: WIFI:T:WPA;S:mynetwork;P:mypass;H:true;;
      try {
        const wifiString = link.data;
        const encType = wifiString.match(/T:([^;]+)/)?.[1] || 'WPA';
        const ssid = wifiString.match(/S:([^;]+)/)?.[1] || '';
        const password = wifiString.match(/P:([^;]+)/)?.[1] || '';
        const hidden = wifiString.includes('H:true');
        
        document.getElementById('wifiSsid').value = ssid;
        document.getElementById('wifiPassword').value = password;
        document.getElementById('wifiEncryption').value = encType;
        document.getElementById('wifiHidden').checked = hidden;
      } catch (e) {
        console.error('Error parsing wifi string', e);
      }
      break;
    case 'contact':
      // Parse vCard: BEGIN:VCARD...
      try {
        const vCard = link.data;
        const name = vCard.match(/FN:([^\n]+)/)?.[1] || '';
        const email = vCard.match(/EMAIL:([^\n]+)/)?.[1] || '';
        const phone = vCard.match(/TEL:([^\n]+)/)?.[1] || '';
        const address = vCard.match(/ADR:;;([^;]+)/)?.[1] || '';
        const website = vCard.match(/URL:([^\n]+)/)?.[1] || '';
        
        document.getElementById('contactName').value = name;
        document.getElementById('contactEmail').value = email;
        document.getElementById('contactPhone').value = phone;
        document.getElementById('contactAddress').value = address;
        document.getElementById('contactWebsite').value = website;
      } catch (e) {
        console.error('Error parsing vCard', e);
      }
      break;
    case 'email':
      // Parse mailto: link
      try {
        const emailString = link.data;
        
        // Extract email address
        let emailAddress = '';
        if (emailString.startsWith('mailto:')) {
          emailAddress = emailString.substring(7).split('?')[0];
        }
        
        // Extract subject and body
        let subject = '';
        let body = '';
        
        if (emailString.includes('?')) {
          const params = new URLSearchParams(emailString.split('?')[1]);
          subject = params.get('subject') || '';
          body = params.get('body') || '';
        }
        
        document.getElementById('emailAddress').value = emailAddress;
        document.getElementById('emailSubject').value = subject;
        document.getElementById('emailBody').value = body;
      } catch (e) {
        console.error('Error parsing email string', e);
      }
      break;
    case 'sms':
      // Parse sms: link
      try {
        const smsString = link.data;
        
        // Extract phone number
        let phoneNumber = '';
        if (smsString.startsWith('sms:')) {
          phoneNumber = smsString.substring(4).split('?')[0];
        }
        
        // Extract message
        let message = '';
        if (smsString.includes('?body=')) {
          message = decodeURIComponent(smsString.split('?body=')[1]);
        }
        
        document.getElementById('smsNumber').value = phoneNumber;
        document.getElementById('smsMessage').value = message;
      } catch (e) {
        console.error('Error parsing sms string', e);
      }
      break;
  }
  
  // Apply saved customization options if available
  if (link.customization) {
    qrCodeOptions = { ...qrCodeOptions, ...link.customization };
    
    // Update UI to reflect loaded customization
    document.getElementById('errorCorrection').value = qrCodeOptions.errorCorrectionLevel;
    document.getElementById('qrSize').value = qrCodeOptions.size;
    document.getElementById('qrSizeValue').textContent = `${qrCodeOptions.size}px`;
    
    // Update color pickers
    if ($("#foregroundColor").spectrum) {
      $("#foregroundColor").spectrum("set", qrCodeOptions.foregroundColor);
    }
    
    if ($("#backgroundColor").spectrum) {
      $("#backgroundColor").spectrum("set", qrCodeOptions.backgroundColor);
    }
  }
  
  // Load tags if available
  if (link.tags && Array.isArray(link.tags)) {
    tagsList = [...link.tags];
    renderTags();
  }
  
  showNotification("QR code loaded");
}

// Delete a saved link
function deleteSavedLink(index) {
  savedLinks.splice(index, 1);
  saveLinkToStorage();
  renderSavedLinks();
  showNotification('Link deleted');
}

// Save current link
function saveCurrentLink() {
  // This function is superseded by saveCurrentQRCode in the new version
  console.log("saveCurrentLink called - using saveCurrentQRCode instead");
  saveCurrentQRCode();
}

// Clear all saved links
function clearAllSavedLinks() {
  if (confirm('Are you sure you want to delete all saved links?')) {
    savedLinks = [];
    saveLinkToStorage();
    renderSavedLinks();
    showNotification('All links cleared');
  }
}

// Live preview functionality
function updatePreview() {
  try {
    const url = document.getElementById("url")?.value.trim() || '';
    const displayPreview = document.getElementById("displayPreview");
    const codePreview = document.getElementById("codePreview");
    
    // Skip updating if elements don't exist (they're from the old version)
    if (!displayPreview || !codePreview) {
      console.log("Preview elements not found - this is expected in the new version");
      return;
    }
    
    const text = document.getElementById("text")?.value.trim() || url;
    const format = document.getElementById("format")?.value || "html";

    if (!url) {
      displayPreview.innerHTML = "";
      codePreview.textContent = "";
      return;
    }

    let link = "";
    switch (format) {
      case "markdown":
        link = `[${text}](${url})`;
        displayPreview.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        break;
      case "bbcode":
        link = `[url=${url}]${text}[/url]`;
        displayPreview.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        break;
      default: // HTML
        link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        displayPreview.innerHTML = link;
    }

    codePreview.textContent = link;
  } catch (error) {
    console.error("Error updating preview:", error);
  }
}

// Add input listeners for live preview
try {
  if (document.getElementById('url') && document.getElementById('text') && document.getElementById('format')) {
    ['url', 'text'].forEach(id => {
      document.getElementById(id).addEventListener('input', updatePreview);
    });
    document.getElementById('format').addEventListener('change', updatePreview);
  }
} catch (error) {
  console.log("Some preview elements not found - this is expected in the new version");
}

// Copy display text functionality - check if elements exist first
const copyDisplayTextButton = document.getElementById("copyDisplayText");
if (copyDisplayTextButton) {
  copyDisplayTextButton.addEventListener("click", async () => {
    const text = document.getElementById("text")?.value.trim() || '';
    const url = document.getElementById("url")?.value.trim() || '';
    
    if (!text && !url) {
      showNotification("Please enter text to copy");
      return;
    }
    
    navigator.clipboard.writeText(text || url).then(() => {
      showNotification("Text copied!");
    }).catch(err => {
      showNotification("Failed to copy: " + err);
    });
  });
}

// Copy as HTML hyperlink - check if element exists first
const copyAsHyperlinkButton = document.getElementById("copyAsHyperlink");
if (copyAsHyperlinkButton) {
  copyAsHyperlinkButton.addEventListener("click", async () => {
    const url = document.getElementById("url")?.value.trim() || '';
    const text = document.getElementById("text")?.value.trim() || url;
    
    if (!url) {
      showNotification("Please enter a URL first");
      return;
    }
    
    const html = `<a href="${url}">${text}</a>`;
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([html], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' })
        })
      ]);
      showNotification("HTML copied!");
    } catch (err) {
      // Fallback method
      copyTextToClipboard(html);
    }
  });
}

// Copy as markdown - check if element exists first
const copyAsMarkdownButton = document.getElementById("copyAsMarkdown");
if (copyAsMarkdownButton) {
  copyAsMarkdownButton.addEventListener("click", () => {
    const url = document.getElementById("url")?.value.trim() || '';
    const text = document.getElementById("text")?.value.trim() || url;
    
    if (!url) {
      showNotification("Please enter a URL first");
      return;
    }
    
    const markdown = `[${text}](${url})`;
    copyTextToClipboard(markdown);
  });
}

// Get QR code data based on active tab
function getQRData() {
  try {
    switch (activeTab) {
      case 'url':
        const url = document.getElementById('url')?.value.trim() || '';
        return url ? url : null;
      
      case 'text':
        const text = document.getElementById('plainText')?.value.trim() || '';
        return text ? text : null;
      
      case 'wifi':
        const ssid = document.getElementById('wifiSsid')?.value.trim() || '';
        const password = document.getElementById('wifiPassword')?.value || '';
        const encryption = document.getElementById('wifiEncryption')?.value || 'WPA';
        const hidden = document.getElementById('wifiHidden')?.checked || false;
        
        if (!ssid) return null;
        
        // WIFI:T:WPA;S:mynetwork;P:mypass;H:true;;
        let wifiString = `WIFI:T:${encryption};S:${ssid};`;
        if (encryption !== 'nopass' && password) {
          wifiString += `P:${password};`;
        }
        if (hidden) {
          wifiString += 'H:true;';
        }
        wifiString += ';';
        return wifiString;
      
      case 'contact':
        const name = document.getElementById('contactName')?.value.trim() || '';
        const email = document.getElementById('contactEmail')?.value.trim() || '';
        const phone = document.getElementById('contactPhone')?.value.trim() || '';
        const address = document.getElementById('contactAddress')?.value.trim() || '';
        const website = document.getElementById('contactWebsite')?.value.trim() || '';
        
        if (!name && !email && !phone && !address && !website) return null;
        
        // Create vCard
        let vCard = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (name) vCard += `FN:${name}\n`;
        if (email) vCard += `EMAIL:${email}\n`;
        if (phone) vCard += `TEL:${phone}\n`;
        if (address) vCard += `ADR:;;${address};;;\n`;
        if (website) vCard += `URL:${website}\n`;
        vCard += 'END:VCARD';
        
        return vCard;
      
      case 'email':
        const emailAddress = document.getElementById('emailAddress')?.value.trim() || '';
        const subject = document.getElementById('emailSubject')?.value.trim() || '';
        const body = document.getElementById('emailBody')?.value.trim() || '';
        
        if (!emailAddress) return null;
        
        let emailString = `mailto:${emailAddress}`;
        const params = [];
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        
        if (params.length > 0) {
          emailString += '?' + params.join('&');
        }
        
        return emailString;
      
      case 'sms':
        const phoneNumber = document.getElementById('smsNumber')?.value.trim() || '';
        const message = document.getElementById('smsMessage')?.value.trim() || '';
        
        if (!phoneNumber) return null;
        
        let smsString = `sms:${phoneNumber}`;
        if (message) {
          smsString += `?body=${encodeURIComponent(message)}`;
        }
        
        return smsString;
      
      default:
        return null;
    }
  } catch (error) {
    console.error("Error getting QR data:", error);
    return null;
  }
}

// Generate QR code
function generateQRCode() {
  console.log("Generate QR code called for tab:", activeTab);
  
  const data = getQRData();
  console.log("QR Data:", data);
  
  if (!data) {
    showNotification("Please enter required information first");
    console.log("No data available to generate QR code");
    
    // Display user-friendly message in the QR code container
    const container = document.getElementById('qrCodeContainer');
    if (container) {
      container.innerHTML = '<div class="empty-state">Please enter required information</div>';
    }
    
    // Disable copy/download buttons
    document.getElementById('copyQRCode').disabled = true;
    document.getElementById('downloadQRCode').disabled = true;
    
    return; // Stop execution if no data
  }
  
  const container = document.getElementById('qrCodeContainer');
  if (!container) {
    console.error("QR code container not found");
    return;
  }
  
  container.innerHTML = '';
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'qrCanvas';
  
  container.appendChild(canvas);
  
  console.log("Generating QR code with options:", {
    size: qrCodeOptions.size,
    foregroundColor: qrCodeOptions.foregroundColor,
    backgroundColor: qrCodeOptions.backgroundColor,
    errorCorrectionLevel: qrCodeOptions.errorCorrectionLevel
  });
  
  // Generate QR code
  QRCode.toCanvas(canvas, data, {
    width: qrCodeOptions.size,
    margin: 1,
    color: {
      dark: qrCodeOptions.foregroundColor,
      light: qrCodeOptions.backgroundColor
    },
    errorCorrectionLevel: qrCodeOptions.errorCorrectionLevel
  }, function (error) {
    if (error) {
      console.error("QR generation error:", error);
      showNotification("Error generating QR code");
      return;
    }
    
    console.log("QR code generated successfully");
    
    // Add logo if one is uploaded and error correction is high enough
    if (qrCodeOptions.logo && (qrCodeOptions.errorCorrectionLevel === 'Q' || qrCodeOptions.errorCorrectionLevel === 'H')) {
      addLogoToQRCode(canvas, qrCodeOptions.logo);
    }
    
    currentQRCode = data;
    document.getElementById('copyQRCode').disabled = false;
    document.getElementById('downloadQRCode').disabled = false;
    showNotification("QR code generated");
  });
}

// Add logo to QR code
function addLogoToQRCode(canvas, logo) {
  try {
    const ctx = canvas.getContext('2d');
    const size = qrCodeOptions.size;
    
    // Calculate logo size (max 30% of QR code)
    const logoSize = Math.min(size * 0.3, 50);
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    
    // Create a rounded rectangle for logo background
    ctx.save();
    ctx.fillStyle = qrCodeOptions.backgroundColor;
    
    // Check if roundRect is available (not available in all browsers)
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 5);
      ctx.fill();
    } else {
      // Fallback for browsers without roundRect
      createRoundedRect(ctx, logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 5);
    }
    
    // Draw the logo
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    
    console.log("Logo added to QR code");
  } catch (error) {
    console.error("Error adding logo to QR code:", error);
  }
}

// Fallback function to create rounded rectangles for browsers without roundRect
function createRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}

// Toggle password visibility
document.getElementById('toggleWifiPassword').addEventListener('click', function() {
  const passwordField = document.getElementById('wifiPassword');
  const icon = this.querySelector('.material-icons');
  
  if (passwordField.type === 'password') {
    passwordField.type = 'text';
    icon.textContent = 'visibility_off';
  } else {
    passwordField.type = 'password';
    icon.textContent = 'visibility';
  }
});

// Save current QR code
function saveCurrentQRCode() {
  try {
    console.log("Attempting to save QR code");
    
    const data = getQRData();
    
    if (!data) {
      showNotification("No QR code data to save");
      return;
    }
    
    // Get title based on active tab
    let title = "";
    let url = "";
    let type = activeTab;
    let icon = "link";
    
    switch (activeTab) {
      case 'url':
        try {
          // Attempt to get domain name for URL
          const urlObj = new URL(document.getElementById('url').value.trim());
          title = urlObj.hostname || "URL";
        } catch (e) {
          // If not a valid URL, just use the raw value
          title = document.getElementById('url').value.trim() || "URL";
        }
        url = document.getElementById('url').value.trim();
        icon = "link";
        break;
      case 'text':
        const text = document.getElementById('plainText').value.trim();
        title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
        url = "Text: " + text.substring(0, 20) + (text.length > 20 ? "..." : "");
        icon = "text_fields";
        break;
      case 'wifi':
        const ssid = document.getElementById('wifiSsid').value.trim();
        title = "Wi-Fi: " + ssid;
        url = "Network: " + ssid;
        icon = "wifi";
        break;
      case 'contact':
        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        title = name || "Contact";
        url = phone ? `${title} - ${phone}` : title;
        icon = "person";
        break;
      case 'email':
        const email = document.getElementById('emailAddress').value.trim();
        const subject = document.getElementById('emailSubject').value.trim();
        title = "Email: " + email;
        url = subject ? `${email} - ${subject}` : email;
        icon = "email";
        break;
      case 'sms':
        const number = document.getElementById('smsNumber').value.trim();
        const message = document.getElementById('smsMessage').value.trim();
        title = "SMS: " + number;
        url = message ? `${number} - ${message.substring(0, 20)}` : number;
        icon = "sms";
        break;
    }
    
    // Check if this QR code already exists
    const existingIndex = savedLinks.findIndex(link => link.data === data);
    
    if (existingIndex !== -1) {
      showNotification("This QR code is already saved");
      return;
    }
    
    // Create a thumbnail of the QR code
    const canvas = document.getElementById('qrCanvas');
    let thumbnailUrl = '';
    
    if (canvas) {
      try {
        thumbnailUrl = canvas.toDataURL('image/png');
        console.log("Thumbnail created successfully");
      } catch (e) {
        console.error("Error creating thumbnail", e);
      }
    }
    
    // Create date string for the saved item
    const now = new Date();
    const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    // Add new QR code
    const newQrCode = {
      title: title,
      url: url,
      data: data,
      type: type,
      icon: icon,
      thumbnail: thumbnailUrl,
      customization: { ...qrCodeOptions },
      date: now.toISOString(),
      created: dateStr,
      tags: [...tagsList]
    };
    
    console.log("Adding new QR code:", newQrCode.title);
    savedLinks.push(newQrCode);
    
    // Sort by newest first
    savedLinks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to storage
    saveLinkToStorage();
    
    // Update UI
    renderSavedLinks();
    
    // Clear tags list
    tagsList = [];
    
    showNotification("QR code saved");
  } catch (error) {
    console.error("Error saving QR code:", error);
    showNotification("Error saving QR code. Please try again.");
  }
}

// Download QR code
function downloadQRCode() {
  const canvas = document.getElementById('qrCanvas');
  
  if (!canvas) {
    showNotification("No QR code to download");
    return;
  }
  
  // Get size based on selected option
  let finalSize;
  switch (downloadOptions.size) {
    case 'small':
      finalSize = 200;
      break;
    case 'large':
      finalSize = 800;
      break;
    default: // medium
      finalSize = 400;
      break;
  }
  
  // Prepare filename based on QR content
  let filename = "qr-code";
  if (activeTab === 'url') {
    const url = document.getElementById('url').value.trim();
    if (url) {
      try {
        const hostname = new URL(url).hostname;
        filename = `qr-${hostname}`;
      } catch(e) {
        // Use default filename if not a valid URL
      }
    }
  } else {
    filename = `qr-${activeTab}`;
  }
  
  // Download based on format
  if (downloadOptions.format === 'svg') {
    downloadAsSVG(canvas, filename, finalSize);
  } else {
    downloadAsPNG(canvas, filename, finalSize);
  }
  
  // Hide download options panel
  document.getElementById('downloadOptions').classList.remove('active');
}

// Download QR as PNG
function downloadAsPNG(canvas, filename, size) {
  // Create a temporary canvas with the desired size
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  
  const ctx = tempCanvas.getContext('2d');
  
  // Fill with background color
  ctx.fillStyle = qrCodeOptions.backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // Draw the QR code scaled to the desired size
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);
  
  // Convert to data URL and trigger download
  tempCanvas.toBlob(function(blob) {
    const url = URL.createObjectURL(blob);
    
    // Create download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${filename}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    
    showNotification("QR code downloaded");
  }, 'image/png');
}

// Download QR as SVG
function downloadAsSVG(canvas, filename, size) {
  // Convert QR code data to SVG format
  const data = getQRData();
  if (!data) return;
  
  QRCode.toString(data, {
    type: 'svg',
    width: size,
    margin: 1,
    color: {
      dark: qrCodeOptions.foregroundColor,
      light: qrCodeOptions.backgroundColor
    },
    errorCorrectionLevel: qrCodeOptions.errorCorrectionLevel
  }, function(error, svgString) {
    if (error) {
      console.error(error);
      showNotification("Error generating SVG");
      return;
    }
    
    // Create blob from SVG string
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${filename}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    
    showNotification("SVG downloaded");
  });
}

// Copy QR code to clipboard
async function copyQRCodeToClipboard() {
  const canvas = document.getElementById('qrCanvas');
  
  if (!canvas) {
    showNotification("No QR code to copy");
    return;
  }
  
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    showNotification("QR code copied to clipboard!");
  } catch (error) {
    console.error(error);
    showNotification("Failed to copy QR code: " + error);
  }
}

// Event Listeners
document.getElementById('generateQR').addEventListener('click', generateQRCode);
document.getElementById('copyQRCode').addEventListener('click', copyQRCodeToClipboard);
document.getElementById('saveLink').addEventListener('click', saveCurrentQRCode);
document.getElementById('clearSavedLinks').addEventListener('click', clearAllSavedLinks);

// Helper function for clipboard operations
function copyTextToClipboard(text) {
  // Try using newer clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification("Copied to clipboard!");
    }).catch(err => {
      showNotification("Failed to copy: " + err);
    });
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showNotification("Copied to clipboard!");
      } else {
        showNotification("Copy failed");
      }
    } catch (err) {
      showNotification("Failed to copy: " + err);
    }
    
    document.body.removeChild(textarea);
  }
}

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  
  // Update theme colors
  updateThemeColors();
});

// Notification system
function showNotification(message) {
  const notification = document.getElementById("copySuccess");
  notification.textContent = message;
  notification.classList.add("show");
  
  setTimeout(() => {
    notification.classList.remove("show");
  }, 2000);
}

// Setup settings button 
function setupSettingsButton() {
  const settingsButton = document.getElementById('settingsButton');
  
  if (!settingsButton) {
    console.error("Settings button not found");
    return;
  }
  
  settingsButton.addEventListener('click', () => {
    // For now, just toggle customize panel
    const customizePanel = document.getElementById('customizePanel');
    customizePanelOpen = !customizePanelOpen;
    customizePanel.classList.toggle('active', customizePanelOpen);
    
    // Show notification
    showNotification("Settings opened");
  });
}

// Setup input event listeners for each tab
function setupInputEventListeners() {
  console.log("Setting up input event listeners");
  
  // Set up the main Generate QR Code button
  const generateButton = document.getElementById('generateQR');
  if (generateButton) {
    console.log("Setting up generate button");
    generateButton.addEventListener('click', function() {
      console.log("Generate button clicked for tab:", activeTab);
      generateQRCode();
    });
  } else {
    console.error("Generate QR button not found");
  }
  
  // Set up search for saved QR codes
  const searchInput = document.getElementById('searchSaved');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      console.log("Searching saved QR codes:", e.target.value);
      searchSavedLinks(e.target.value);
    });
  }
  
  // URL tab
  const urlInput = document.getElementById('url');
  if (urlInput) {
    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        generateQRCode();
      }
    });
  }
  
  // Text tab
  const textInput = document.getElementById('plainText');
  if (textInput) {
    textInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        generateQRCode();
      }
    });
  }
  
  // WiFi tab inputs
  const wifiInputs = ['wifiSsid', 'wifiPassword'];
  wifiInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          generateQRCode();
        }
      });
    }
  });
  
  // Contact tab inputs
  const contactInputs = ['contactName', 'contactEmail', 'contactPhone', 'contactAddress', 'contactWebsite'];
  contactInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          generateQRCode();
        }
      });
    }
  });
  
  // Email tab inputs
  const emailInputs = ['emailAddress', 'emailSubject'];
  emailInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          generateQRCode();
        }
      });
    }
  });
  
  // SMS tab inputs
  const smsInputs = ['smsNumber'];
  smsInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          generateQRCode();
        }
      });
    }
  });
  
  console.log("Input event listeners set up");
}