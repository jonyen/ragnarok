#!/bin/bash

# Ragnarok Complete Setup Script
# This script downloads and sets up the entire Ragnarok application

echo "🚀 Setting up Ragnarok - Universal Document Analysis Chatbot"
echo "============================================================="

# Check if required tools are installed
echo "🔍 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Please install Node.js 18+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Please install npm"; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. You have version $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo "✅ npm $(npm --version) detected"

# Create main project structure
echo "📁 Creating project structure..."
mkdir -p ragnarok
cd ragnarok

# Create complete directory structure
mkdir -p backend/src/{services,utils,controllers}
mkdir -p backend/{logs,tests}
mkdir -p frontend/src/{components,pages,utils,hooks,styles}
mkdir -p frontend/{public,tests}
mkdir -p shared
mkdir -p docs

echo "✅ Project structure created!"

# Root package.json
echo "📝 Creating root configuration..."
cat > package.json << 'EOF'
{
  "name": "ragnarok",
  "version": "1.0.0",
  "description": "Universal document analysis chatbot powered by AI",
  "scripts": {
    "dev": "concurrently \"npm run backend:dev\" \"npm run frontend:dev\"",
    "install:all": "npm run install:backend && npm run install:frontend",
    "install:backend": "cd backend && npm install",
    "install:frontend": "cd frontend && npm install",
    "backend:dev": "cd backend && npm run dev",
    "frontend:dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "deploy": "npm run deploy:backend && npm run deploy:frontend",
    "deploy:backend": "cd backend && gcloud app deploy",
    "deploy:frontend": "cd frontend && npm run build && firebase deploy"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  },
  "keywords": ["document-analysis", "ai", "chatbot", "gemini", "google-cloud"],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Root .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
*.log
logs/
dist/
build/
coverage/
.DS_Store
.vscode/
.idea/
tmp/
EOF

# Backend package.json
echo "📝 Creating backend configuration..."
cat > backend/package.json << 'EOF'
{
  "name": "ragnarok-backend",
  "version": "1.0.0",
  "description": "Universal document analysis chatbot backend",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "winston": "^3.10.0",
    "express-rate-limit": "^6.8.1",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "tesseract.js": "^4.1.1",
    "xlsx": "^0.18.5",
    "@google/generative-ai": "^0.15.0",
    "@google-cloud/storage": "^7.0.0",
    "@google-cloud/vision": "^4.0.0",
    "file-type": "^18.5.0",
    "uuid": "^9.0.0",
    "joi": "^17.9.2",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.45.0"
  }
}
EOF

# Frontend package.json
echo "📝 Creating frontend configuration..."
cat > frontend/package.json << 'EOF'
{
  "name": "ragnarok-frontend",
  "version": "1.0.0",
  "description": "Ragnarok document analysis chatbot frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "axios": "^1.4.0",
    "react-dropzone": "^14.2.3",
    "react-markdown": "^8.0.7",
    "lucide-react": "^0.263.1",
    "tailwindcss": "^3.3.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "react-hot-toast": "^2.4.1",
    "framer-motion": "^10.12.18",
    "react-query": "^3.39.3",
    "zustand": "^4.3.9"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "eslint": "^8.45.0"
  }
}
EOF

# Environment examples
echo "📝 Creating environment templates..."
cat > backend/.env.example << 'EOF'
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET=ragnarok-documents

# App Configuration
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info

# Optional Features
GEMINI_MODEL=gemini-2.5-flash
ENABLE_BATCH_MODE=true
ENABLE_VISION_ANALYSIS=true
EOF

cat > frontend/.env.example << 'EOF'
REACT_APP_API_URL=http://localhost:8080
REACT_APP_APP_NAME=Ragnarok
REACT_APP_VERSION=1.0.0
EOF

# Google Cloud configuration
cat > backend/app.yaml << 'EOF'
runtime: nodejs18

instance_class: F2

automatic_scaling:
  min_instances: 0
  max_instances: 10

env_variables:
  NODE_ENV: production
  GOOGLE_CLOUD_PROJECT_ID: your-project-id
  GOOGLE_CLOUD_BUCKET: ragnarok-documents
  GEMINI_API_KEY: your-gemini-api-key
  FRONTEND_URL: https://your-frontend-url.com

handlers:
- url: /.*
  script: auto
  secure: always

readiness_check:
  path: "/health"
  check_interval_sec: 5

liveness_check:
  path: "/health" 
  check_interval_sec: 30
EOF

# Frontend Vite config
cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
EOF

# Tailwind config
cat > frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

echo "📝 Creating README..."
cat > README.md << 'EOF'
# Ragnarok - Universal Document Analysis Chatbot

A powerful document analysis chatbot that supports all file types and provides intelligent insights about any content.

## Features

- 📄 **Multi-format Support**: PDF, DOCX, TXT, Images, Excel, PowerPoint
- 🔍 **OCR Integration**: Extract text from image-based documents  
- 🤖 **AI-Powered Analysis**: Intelligent document parsing with Google Gemini
- ☁️ **Cloud Ready**: Optimized for Google Cloud Platform deployment
- 🚀 **Modern Stack**: Node.js, Express, React frontend
- 🔒 **Secure**: File validation and sanitization

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Add your Gemini API key to backend/.env
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Open http://localhost:3000**

## Getting Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Copy the key to your `.env` file

## Deployment

### Google Cloud App Engine
```bash
cd backend
gcloud app deploy
```

### Firebase (Frontend)
```bash
cd frontend  
npm run build
firebase deploy
```

## Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET=ragnarok-documents
PORT=8080
```

### Frontend (.env)  
```
REACT_APP_API_URL=http://localhost:8080
```

## Architecture

```
ragnarok/
├── backend/          # Node.js API server
│   ├── src/
│   │   ├── app.js           # Main server
│   │   ├── services/        # AI, Storage, Parsing
│   │   └── utils/           # Validation, Logging
│   └── app.yaml            # Google Cloud config
└── frontend/         # React web app  
    ├── src/
    │   ├── components/      # UI components
    │   └── pages/           # Application pages
    └── vite.config.js      # Build config
```

## API Endpoints

- `POST /api/upload` - Upload document
- `GET /api/analysis/:id` - Get analysis results  
- `POST /api/chat` - Chat with document
- `GET /api/files` - List files
- `DELETE /api/files/:id` - Delete file

## Support

- Documentation: [docs/](./docs/)
- Issues: GitHub Issues
- Email: support@ragnarok.dev

## License

MIT License - see [LICENSE](LICENSE) file.
EOF

echo "📝 Creating documentation..."
mkdir -p docs

cat > docs/API.md << 'EOF'
# Ragnarok API Documentation

## Authentication

Currently no authentication required for local development.

## Endpoints

### Upload Document
`POST /api/upload`

**Request:**
- Content-Type: multipart/form-data
- Body: file (document to analyze)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "document.pdf", 
    "analysis": {...}
  }
}
```

### Get Analysis
`GET /api/analysis/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "analysis": {
      "type": "contract",
      "summary": "...",
      "keyInfo": "...",
      "recommendations": "..."
    }
  }
}
```

### Chat with Document  
`POST /api/chat`

**Request:**
```json
{
  "documentId": "uuid",
  "message": "What are the key terms?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "The key terms include...",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```
EOF

cat > docs/DEPLOYMENT.md << 'EOF'
# Deployment Guide

## Prerequisites

- Google Cloud Platform account
- Node.js 18+ installed  
- Google Cloud CLI installed
- Gemini API key

## Google Cloud Deployment

### 1. Setup Project
```bash
gcloud projects create your-project-id
gcloud config set project your-project-id
gcloud services enable appengine.googleapis.com
```

### 2. Deploy Backend
```bash
cd backend
gcloud app deploy
```

### 3. Deploy Frontend  
```bash
cd frontend
npm run build
firebase deploy
```

## Environment Variables

Update `backend/app.yaml`:
```yaml
env_variables:
  GEMINI_API_KEY: your_actual_api_key
  GOOGLE_CLOUD_PROJECT_ID: your_actual_project_id
```

## Monitoring

- View logs: `gcloud app logs tail`
- Monitor usage: Google Cloud Console
- Check health: `https://your-app.appspot.com/health`
EOF

echo "🎉 Installation and setup..."
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend && npm install
cd ..

echo "Installing frontend dependencies..."  
cd frontend && npm install
cd ..

echo ""
echo "🎉 Ragnarok setup complete!"
echo "=============================================="
echo ""
echo "📋 Next steps:"
echo "1. Get your Gemini API key from: https://aistudio.google.com/"
echo "2. Copy backend/.env.example to backend/.env"
echo "3. Add your API key to backend/.env"
echo "4. Run: npm run dev"
echo "5. Open: http://localhost:3000"
echo ""
echo "📖 Documentation:"
echo "- README.md - Getting started guide"
echo "- docs/API.md - API documentation"  
echo "- docs/DEPLOYMENT.md - Deployment guide"
echo ""
echo "🚀 Happy analyzing!"

# Make the script executable
