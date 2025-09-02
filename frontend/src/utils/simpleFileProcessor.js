/**
 * Simple, browser-compatible file processor
 * Focuses on text-based files that work reliably in browsers
 */

/**
 * Extract text content from browser-safe file types
 * @param {File} file - The file to process
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromFile(file) {
  try {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    // PDF files using PDF.js
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        
        // Use matching worker version for the installed PDF.js library
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        console.log(`PDF.js worker configured with matching version: ${pdfjsLib.version}`);
        
        const arrayBuffer = await file.arrayBuffer();
        console.log(`PDF file size: ${arrayBuffer.byteLength} bytes`);
        
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          verbosity: 0 // Reduce verbose logging
        }).promise;
        
        let fullText = '';
        const numPages = pdf.numPages;
        console.log(`PDF has ${numPages} pages`);
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          console.log(`Processing PDF page ${pageNum}/${numPages}`);
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          console.log(`Page ${pageNum} has ${textContent.items.length} text items`);
          
          const pageText = textContent.items
            .map(item => {
              // Handle both string and object items
              if (typeof item === 'string') {
                return item;
              } else if (item.str) {
                return item.str;
              } else if (item.chars) {
                return item.chars;
              }
              return '';
            })
            .filter(text => text.trim().length > 0)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += `Page ${pageNum}:\n${pageText.trim()}\n\n`;
            console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
          } else {
            console.warn(`Page ${pageNum} has no extractable text`);
          }
        }
        
        console.log(`Total extracted text length: ${fullText.length} characters`);
        return fullText.trim() || 'No text content found in PDF - this might be an image-based PDF requiring OCR';
      } catch (error) {
        console.error('PDF processing error:', error);
        return `PDF processing failed: ${error.message}. The PDF might be image-based or corrupted.`;
      }
    }

    // Text files (.txt, .md, etc.)
    if (fileType.startsWith('text/') || 
        fileName.endsWith('.txt') || 
        fileName.endsWith('.md') || 
        fileName.endsWith('.markdown')) {
      return await file.text();
    }

    // CSV files
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const text = await file.text();
      // Simple CSV parsing for better readability
      const lines = text.split('\n');
      let formattedText = 'CSV Data:\n\n';
      lines.forEach((line, index) => {
        if (line.trim()) {
          const cells = line.split(',').map(cell => cell.trim());
          formattedText += `Row ${index + 1}: ${cells.join(' | ')}\n`;
        }
      });
      return formattedText;
    }

    // JSON files
    if (fileType === 'application/json' || fileName.endsWith('.json')) {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        return `JSON Content:\n\n${JSON.stringify(parsed, null, 2)}`;
      } catch (e) {
        return `JSON Content (raw):\n\n${text}`;
      }
    }

    // JavaScript/TypeScript files
    if (fileName.endsWith('.js') || fileName.endsWith('.ts') || 
        fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
      const text = await file.text();
      return `Code File (${fileName.split('.').pop()}):\n\n${text}`;
    }

    // HTML/XML files
    if (fileType === 'text/html' || fileName.endsWith('.html') || 
        fileName.endsWith('.xml') || fileName.endsWith('.svg')) {
      const text = await file.text();
      // Remove HTML tags for better readability
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return `HTML/XML Content:\n\n${cleanText}`;
    }

    // Try to read as text (fallback for unknown text-based formats)
    if (file.size < 1024 * 1024) { // Only try for files < 1MB
      try {
        const text = await file.text();
        if (text && text.trim().length > 0) {
          // Check if it looks like readable text (not binary)
          const printableChars = text.match(/[\x20-\x7E\n\r\t]/g);
          if (printableChars && printableChars.length / text.length > 0.7) {
            return `Text Content:\n\n${text}`;
          }
        }
      } catch (error) {
        // Not a text file, continue to error
      }
    }

    // Unsupported file type
    throw new Error(`Unsupported file type: ${fileType || 'unknown'}\n\nSupported formats:\n• Text files (.txt, .md)\n• CSV files (.csv)\n• JSON files (.json)\n• Code files (.js, .ts, .jsx, .tsx)\n• HTML/XML files (.html, .xml)\n\nFor PDF and Word documents, please convert to text format first.`);

  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

/**
 * Split text into chunks for embedding
 * @param {string} text - The text to chunk
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {Array<string>} - Array of text chunks
 */
export function chunkText(text, maxChunkSize = 1000, overlap = 100) {
  if (!text || text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // If we're not at the end, try to find a good breaking point
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const lastSpace = text.lastIndexOf(' ', end);
      
      // Use the best breaking point
      const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
      if (breakPoint > start + maxChunkSize * 0.7) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    
    // Move start position with overlap
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Get file metadata
 * @param {File} file - The file to analyze
 * @returns {Object} - File metadata
 */
export function getFileMetadata(file) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    extension: file.name.split('.').pop()?.toLowerCase() || '',
  };
}

/**
 * Validate if file type is supported for text extraction
 * @param {File} file - The file to validate
 * @returns {boolean} - True if supported
 */
export function isSupportedFileType(file) {
  const supportedTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown',
    'application/json',
    'text/javascript',
    'application/javascript'
  ];

  const supportedExtensions = [
    '.pdf', '.txt', '.md', '.markdown', '.csv', '.json', 
    '.js', '.ts', '.jsx', '.tsx', '.html', '.xml', '.svg'
  ];
  
  const fileName = file.name.toLowerCase();
  
  return supportedTypes.includes(file.type.toLowerCase()) || 
         supportedExtensions.some(ext => fileName.endsWith(ext)) ||
         file.type.toLowerCase().startsWith('text/');
}