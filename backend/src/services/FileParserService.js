const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const { createWorker } = require('tesseract.js');
const logger = require('../utils/Logger');

class FileParserService {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.parsePDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.parseDocx.bind(this),
      'application/msword': this.parseDoc.bind(this),
      'text/plain': this.parseText.bind(this),
      'image/jpeg': this.parseImage.bind(this),
      'image/png': this.parseImage.bind(this),
      'image/gif': this.parseImage.bind(this),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': this.parseExcel.bind(this),
      'application/vnd.ms-excel': this.parseExcel.bind(this),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': this.parsePowerPoint.bind(this)
    };
  }

  async parseFile(file) {
    try {
      const mimeType = file.mimetype;
      logger.info(`Parsing file of type: ${mimeType}`);

      if (!this.supportedTypes[mimeType]) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const parser = this.supportedTypes[mimeType];
      const extractedText = await parser(file.buffer, file.originalname);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in file');
      }

      logger.info(`Successfully extracted ${extractedText.length} characters from ${file.originalname}`);
      return extractedText;

    } catch (error) {
      logger.error(`Error parsing file ${file.originalname}:`, error);
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  }

  async parsePDF(buffer, filename) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error(`PDF parsing error for ${filename}:`, error);
      throw new Error('Failed to parse PDF file');
    }
  }

  async parseDocx(buffer, filename) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } catch (error) {
      logger.error(`DOCX parsing error for ${filename}:`, error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  async parseDoc(buffer, filename) {
    // For older .doc files, we'll use mammoth as well
    // Note: mammoth has limited support for .doc files
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } catch (error) {
      logger.error(`DOC parsing error for ${filename}:`, error);
      throw new Error('Failed to parse DOC file. Please convert to DOCX format for better results.');
    }
  }

  async parseText(buffer, filename) {
    try {
      return buffer.toString('utf-8');
    } catch (error) {
      logger.error(`Text parsing error for ${filename}:`, error);
      throw new Error('Failed to parse text file');
    }
  }

  async parseImage(buffer, filename) {
    try {
      logger.info(`Starting OCR processing for ${filename}`);
      
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      
      if (!text || text.trim().length < 10) {
        throw new Error('OCR could not extract meaningful text from image');
      }
      
      return text;
    } catch (error) {
      logger.error(`Image OCR error for ${filename}:`, error);
      throw new Error('Failed to extract text from image using OCR');
    }
  }

  async parseExcel(buffer, filename) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';

      // Process all worksheets
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert rows to text
        jsonData.forEach(row => {
          if (row && row.length > 0) {
            allText += row.filter(cell => cell !== null && cell !== undefined).join(' ') + '\n';
          }
        });
      });

      return allText.trim();
    } catch (error) {
      logger.error(`Excel parsing error for ${filename}:`, error);
      throw new Error('Failed to parse Excel file');
    }
  }

  async parsePowerPoint(buffer, filename) {
    try {
      // For PowerPoint files, we'll need a different approach
      // This is a simplified version - you might want to use a more robust library
      // like node-pptx or officegen for better PowerPoint support
      
      // For now, we'll return a placeholder message
      logger.warn(`PowerPoint parsing not fully implemented for ${filename}`);
      return `PowerPoint file detected: ${filename}. Please convert to PDF or text format for full text extraction.`;
    } catch (error) {
      logger.error(`PowerPoint parsing error for ${filename}:`, error);
      throw new Error('Failed to parse PowerPoint file');
    }
  }

  // Utility method to detect file type from buffer
  async detectFileType(buffer, originalname) {
    const fileType = await import('file-type');
    const type = await fileType.fileTypeFromBuffer(buffer);
    
    if (type) {
      return type.mime;
    }
    
    // Fallback to extension-based detection
    const ext = path.extname(originalname).toLowerCase();
    const extToMime = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    
    return extToMime[ext] || 'application/octet-stream';
  }

  // Get supported file extensions
  getSupportedExtensions() {
    return [
      '.pdf', '.docx', '.doc', '.txt', 
      '.jpg', '.jpeg', '.png', '.gif',
      '.xlsx', '.xls', '.pptx'
    ];
  }

  // Validate if file type is supported
  isFileTypeSupported(mimeType) {
    return Object.keys(this.supportedTypes).includes(mimeType);
  }
}

module.exports = FileParserService;