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
