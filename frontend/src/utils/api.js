import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    } else if (error.response?.status === 500) {
      // Handle server errors
      console.error('Server error');
    }
    return Promise.reject(error);
  }
);

export const uploadDocument = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('document', file);

  return api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

export const getAnalysis = async (id) => {
  return api.get(`/api/analysis/${id}`);
};

export const chatWithDocument = async (documentId, message, conversationHistory = []) => {
  return api.post('/api/chat', {
    documentId,
    message,
    conversationHistory,
  });
};

export const getFiles = async () => {
  return api.get('/api/files');
};

export const deleteFile = async (id) => {
  return api.delete(`/api/files/${id}`);
};

export const healthCheck = async () => {
  return api.get('/health');
};

export default api;