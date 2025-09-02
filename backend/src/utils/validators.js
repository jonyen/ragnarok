const fileType = require('file-type');
const Joi = require('joi');

const allowedMimeTypes = [
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

const maxFileSize = 10 * 1024 * 1024; // 10MB

async function validateFile(file) {
  try {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > maxFileSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Unsupported file type' };
    }

    const detectedType = await fileType.fromBuffer(file.buffer);
    
    if (detectedType && !allowedMimeTypes.includes(detectedType.mime)) {
      return { isValid: false, error: 'File content does not match declared type' };
    }

    const isExecutable = await checkForExecutableContent(file.buffer);
    if (isExecutable) {
      return { isValid: false, error: 'Executable files are not allowed' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'File validation failed' };
  }
}

async function checkForExecutableContent(buffer) {
  const executableSignatures = [
    Buffer.from([0x4D, 0x5A]), // PE executable
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
    Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
    Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable
  ];

  return executableSignatures.some(signature => 
    buffer.indexOf(signature) === 0
  );
}

function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const schema = Joi.string()
    .max(5000)
    .pattern(/^[a-zA-Z0-9\s\.\,\?\!\-\(\)\[\]\{\}\:\;\'\"\@\#\$\%\^\&\*\+\=\_\|\\\/\~\`]*$/)
    .required();

  const { error, value } = schema.validate(input.trim());
  
  if (error) {
    return null;
  }

  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

function validateChatRequest(req) {
  const schema = Joi.object({
    documentId: Joi.string().uuid().required(),
    message: Joi.string().min(1).max(5000).required(),
    conversationHistory: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().max(10000).required()
      })
    ).max(50).optional()
  });

  return schema.validate(req.body);
}

function validateFileId(id) {
  const schema = Joi.string().uuid().required();
  return schema.validate(id);
}

module.exports = {
  validateFile,
  sanitizeInput,
  validateChatRequest,
  validateFileId
};