// Use dynamic imports for browser compatibility
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Extract text content from various file types
 * @param {File} file - The file to process
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromFile(file) {
  try {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    // PDF files - use PDF.js for browser compatibility
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        // Use PDF.js library for browser-based PDF parsing
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker path for PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        return fullText.trim();
      } catch (error) {
        console.warn('PDF parsing failed, trying fallback method:', error);
        // Fallback: return error message or try to read as text
        throw new Error(`PDF parsing not available in browser. Please convert to text format first.`);
      }
    }

    // Word documents (.docx)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } catch (error) {
        console.warn('Word document parsing failed:', error);
        throw new Error(`Word document parsing failed: ${error.message}. Try converting to PDF or text format.`);
      }
    }

    // Excel files (.xlsx, .xls)
    if (fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `Sheet: ${sheetName}\n${csv}\n\n`;
      });
      
      return text;
    }

    // CSV files
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      return JSON.stringify(parsed.data, null, 2);
    }

    // Text files (.txt, .md, etc.)
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await file.text();
    }

    // JSON files
    if (fileType === 'application/json' || fileName.endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    }

    // For other file types, try to read as text
    try {
      return await file.text();
    } catch (error) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.name}: ${error.message}`);
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
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'text/markdown',
    'application/json'
  ];

  const supportedExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt', '.md', '.json'];
  
  return supportedTypes.includes(file.type.toLowerCase()) || 
         supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}