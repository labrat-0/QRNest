/**
 * QR Nest - SVG Support Module
 * 
 * This module extends QRCode.js to add proper SVG export functionality
 */

(function() {
  // Check if QRCode library is loaded
  if (!window.QRCode) {
    console.error('QRCode.js must be loaded before svg-support.js');
    return;
  }
  
  // Ensure QRCode.prototype is available before extending it
  if (!QRCode.prototype) {
    console.error('QRCode.prototype is not available');
    return;
  }
  
  // Original toSVG function from the library but with better formatting and style attributes
  QRCode.prototype.createSVG = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;
    
    var size = this._htOption.width;
    var qrSize = size - (margin * 2);
    
    var svg = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
      `  width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      `  <rect width="100%" height="100%" fill="${this._htOption.colorLight}"/>`,
      `  <g transform="translate(${margin},${margin})">`
    ];
    
    // Add QR code cells
    if (this._oQRCode) {
      var nCount = this._oQRCode.getModuleCount();
      var nWidth = qrSize / nCount;
      var nOffset = Math.floor(nWidth / 2);
      
      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          if (this._oQRCode.isDark(row, col)) {
            svg.push(`<rect x="${col * nWidth}" y="${row * nWidth}" width="${nWidth}" height="${nWidth}" fill="${this._htOption.colorDark}"/>`);
          }
        }
      }
    }
    
    svg.push('  </g>');
    svg.push('</svg>');
    
    return svg.join('\n');
  };
  
  // Add a static method to QRCode for direct SVG string generation
  QRCode.toString = function(text, options, cb) {
    options = options || {};
    options.width = options.width || 200;
    options.height = options.height || 200;
    
    const qrcode = new QRCode({
      text: text,
      width: options.width,
      height: options.height,
      colorDark: options.color?.dark || '#000000',
      colorLight: options.color?.light || '#ffffff',
      correctLevel: QRCode.CorrectLevel[options.errorCorrectionLevel || 'M']
    });
    
    try {
      const svgString = qrcode.createSVG(options.cellSize, options.margin);
      if (cb) cb(null, svgString);
      return svgString;
    } catch (e) {
      if (cb) cb(e);
      throw e;
    }
  };
  
  // Add a method to create a rounded SVG that can contain a logo
  QRCode.toRoundedSVG = function(text, options, cb) {
    options = options || {};
    
    // Create base SVG
    const svgString = QRCode.toString(text, options);
    
    if (options.logo) {
      // Add logo to SVG string
      // This would require more complex XML manipulation
      // For now, we just return the base SVG
      if (cb) cb(null, svgString);
      return svgString;
    } else {
      if (cb) cb(null, svgString);
      return svgString;
    }
  };
})(); 