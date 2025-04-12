console.log("QR Nest loading...");
// Log any errors during loading
window.addEventListener('error', function(e) {
  console.error('Error during page load:', e.message, 'in', e.filename, 'line', e.lineno);
});

// Check if required libraries are loaded properly
document.addEventListener('DOMContentLoaded', function() {
  console.log("Checking if required libraries are loaded:");
  
  // Check for jQuery
  if (typeof $ === 'undefined') {
    console.error("jQuery is not loaded. Some features may not work properly.");
  } else {
    console.log("jQuery is loaded:", $.fn.jquery);
  }
  
  // Check for QRCode.js
  if (typeof QRCode === 'undefined') {
    console.error("QRCode.js is not loaded. QR code generation will not work.");
  } else {
    console.log("QRCode.js is loaded");
  }
  
  // Check for Spectrum color picker
  if (typeof $ !== 'undefined' && typeof $.fn.spectrum === 'undefined') {
    console.error("Spectrum color picker is not loaded. Color customization will not work.");
  } else if (typeof $ !== 'undefined') {
    console.log("Spectrum color picker is loaded");
  }
  
  // Check if chrome API is available
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.error("Chrome API is not available or missing required permissions.");
  } else {
    console.log("Chrome storage API is available");
  }
}); 