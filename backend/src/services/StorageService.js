const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');

class StorageService {
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'ragnarok-documents';
    this.bucket = this.storage.bucket(this.bucketName);
    this.analyses = new Map();
  }

  async uploadFile(file) {
    try {
      const fileId = uuidv4();
      const fileName = `${fileId}-${file.originalname}`;
      const fileUpload = this.bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            fileId: fileId
          }
        }
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          logger.error('File upload error:', error);
          reject(new Error('Failed to upload file to cloud storage'));
        });

        stream.on('finish', () => {
          logger.info(`File uploaded successfully: ${fileName}`);
          resolve(fileId);
        });

        stream.end(file.buffer);
      });
    } catch (error) {
      logger.error('Storage service upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async saveAnalysis(fileId, analysis) {
    try {
      this.analyses.set(fileId, analysis);
      
      const analysisFileName = `analyses/${fileId}.json`;
      const file = this.bucket.file(analysisFileName);
      
      await file.save(JSON.stringify(analysis, null, 2), {
        metadata: {
          contentType: 'application/json'
        }
      });

      logger.info(`Analysis saved for file: ${fileId}`);
    } catch (error) {
      logger.error('Save analysis error:', error);
      throw new Error('Failed to save analysis');
    }
  }

  async getAnalysis(fileId) {
    try {
      if (this.analyses.has(fileId)) {
        return this.analyses.get(fileId);
      }

      const analysisFileName = `analyses/${fileId}.json`;
      const file = this.bucket.file(analysisFileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }

      const [contents] = await file.download();
      const analysis = JSON.parse(contents.toString());
      
      this.analyses.set(fileId, analysis);
      return analysis;
    } catch (error) {
      logger.error('Get analysis error:', error);
      return null;
    }
  }

  async listFiles() {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: '',
        delimiter: '/'
      });

      const fileList = files
        .filter(file => !file.name.startsWith('analyses/'))
        .map(file => {
          const metadata = file.metadata;
          return {
            id: metadata.metadata?.fileId || file.name,
            name: metadata.metadata?.originalName || file.name,
            uploadedAt: metadata.metadata?.uploadedAt || metadata.timeCreated,
            size: metadata.size,
            contentType: metadata.contentType
          };
        });

      return fileList;
    } catch (error) {
      logger.error('List files error:', error);
      throw new Error('Failed to list files');
    }
  }

  async deleteFile(fileId) {
    try {
      const [files] = await this.bucket.getFiles();
      const fileToDelete = files.find(file => 
        file.metadata.metadata?.fileId === fileId
      );

      if (fileToDelete) {
        await fileToDelete.delete();
      }

      const analysisFile = this.bucket.file(`analyses/${fileId}.json`);
      const [analysisExists] = await analysisFile.exists();
      if (analysisExists) {
        await analysisFile.delete();
      }

      this.analyses.delete(fileId);
      logger.info(`File and analysis deleted: ${fileId}`);
    } catch (error) {
      logger.error('Delete file error:', error);
      throw new Error('Failed to delete file');
    }
  }
}

module.exports = StorageService;