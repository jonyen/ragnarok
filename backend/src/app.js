const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const FileParserService = require('./services/FileParserService');
const GeminiAIService = require('./services/GeminiAIService');
const StorageService = require('./services/StorageService');
const logger = require('./utils/Logger');
const { validateFile, sanitizeInput } = require('./utils/validators');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// Services
const fileParser = new FileParserService();
const aiService = new GeminiAIService();
const storageService = new StorageService();

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Upload and analyze resume
app.post('/api/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    logger.info(`Processing file: ${req.file.originalname}`);

    // Validate file
    const validation = await validateFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Parse file based on type
    const extractedText = await fileParser.parseFile(req.file);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    // Store file in cloud storage
    const fileId = await storageService.uploadFile(req.file);

    // Analyze with AI
    const analysis = await aiService.analyzeDocument(extractedText);

    // Store analysis result
    const result = {
      id: fileId,
      filename: req.file.originalname,
      extractedText: extractedText.substring(0, 1000) + '...', // Truncate for response
      analysis: analysis,
      uploadedAt: new Date().toISOString()
    };

    await storageService.saveAnalysis(fileId, result);

    res.status(200).json({
      success: true,
      data: {
        id: fileId,
        filename: req.file.originalname,
        analysis: analysis
      }
    });

  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process resume',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get analysis by ID
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await storageService.getAnalysis(id);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    logger.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis' });
  }
});

// Chat with document
app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, message, conversationHistory = [] } = req.body;

    // Validate input
    const sanitizedMessage = sanitizeInput(message);
    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Get document analysis
    const analysis = await storageService.getAnalysis(documentId);
    if (!analysis) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate AI response
    const response = await aiService.chatWithDocument(
      analysis.extractedText,
      sanitizedMessage,
      conversationHistory
    );

    res.status(200).json({
      success: true,
      data: {
        response: response,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Advanced chat with document using LangChain
app.post('/api/chat/advanced', async (req, res) => {
  try {
    const { 
      documentId, 
      message, 
      conversationHistory = [], 
      options = {} 
    } = req.body;

    // Validate input
    const sanitizedMessage = sanitizeInput(message);
    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Get document analysis
    const analysis = await storageService.getAnalysis(documentId);
    if (!analysis) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate AI response with advanced context handling
    const result = await aiService.chatWithDocumentAdvanced(
      analysis.extractedText,
      sanitizedMessage,
      conversationHistory,
      options
    );

    res.status(200).json({
      success: true,
      data: {
        response: result.response,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Advanced chat error:', error);
    res.status(500).json({ error: 'Failed to process advanced chat message' });
  }
});

// List uploaded files
app.get('/api/files', async (req, res) => {
  try {
    const files = await storageService.listFiles();
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    logger.error('List files error:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storageService.deleteFile(id);
    res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  logger.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Ragnarok backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});