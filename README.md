# 🤖 Ragnarok AI - Universal Document Analysis Chatbot

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-brightgreen)](https://frontend-gzu256n4z-jonyens-projects.vercel.app)

[Video Recording](https://app.airtimetools.com/recorder/s/z_JsT55LxjjX6Co8ds4sFG)

> **Ragnarok** is an AI-powered document analysis chatbot that combines semantic search with large language models to provide intelligent Q&A over your documents. Upload files, ask questions, and get contextual answers powered by cutting-edge AI.

## ✨ Features

- 🗄️ **Multi-format Document Support** - PDF, TXT, CSV, DOCX, and more
- 🧠 **AI-Powered Analysis** - Semantic document search using vector embeddings
- 💬 **Intelligent Chat Interface** - Natural conversations about your documents
- 🔍 **Semantic Search** - Find relevant content using meaning, not just keywords
- 🌐 **Universal Questions** - Handles both document-specific and general queries
- ⚡ **Real-time Processing** - Instant document analysis and embedding generation
- 🔒 **Privacy-First** - All processing happens client-side, your data stays private
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🎯 Use Cases

- **Research Assistant** - Analyze academic papers, reports, and articles
- **Business Intelligence** - Extract insights from business documents
- **Legal Document Review** - Search through contracts and legal documents  
- **Content Analysis** - Understand themes and topics across document collections
- **Personal Knowledge Base** - Build your own searchable document library

## 🚀 Quick Start

### Option 1: Use Live Demo
Visit the live deployment: [https://frontend-gzu256n4z-jonyens-projects.vercel.app](https://frontend-gzu256n4z-jonyens-projects.vercel.app)

### Option 2: Run Locally
```bash
# Clone the repository
git clone <your-repo-url>
cd ragnarok/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Start development server
npm run dev

# Open http://localhost:3000
```

### Required API Keys
Create a `.env` file with:
```env
VITE_EMBEDDING_PROVIDER=huggingface
VITE_LLM_PROVIDER=google
VITE_HUGGINGFACE_API_KEY=your_hf_key_here
VITE_GOOGLE_API_KEY=your_google_key_here
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           Frontend (React + Vite)              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   File Upload   │  │   Chat Interface │  │  Document View  │ │
│  │   Component     │  │   (SimpleChatbot)│  │   Component     │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
│              │                    │                    │         │
│              v                    v                    v         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 Core Processing Layer                       │ │
│  │  ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐│ │
│  │  │ File Processor│ │ Vector Store  │ │  LangChain Service  ││ │
│  │  │   (PDF.js,    │ │  (In-Memory)  │ │  (RAG Chain)        ││ │
│  │  │   Mammoth)    │ │               │ │                     ││ │
│  │  └───────────────┘ └───────────────┘ └─────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│              │                    │                    │         │
│              v                    v                    v         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Text Extraction │  │ Embedding Store  │  │   AI Responses  │ │
│  │    & Chunking   │  │ (Cosine Search)  │  │                 │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────────┐
│                        External AI APIs                        │
│  ┌─────────────────┐              ┌─────────────────────────────┐│
│  │ Hugging Face    │              │      Google Gemini          ││
│  │ Transformers    │              │      (via LangChain)        ││
│  │ (Embeddings)    │              │      (Text Generation)      ││
│  └─────────────────┘              └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Lightning-fast build tool and dev server
- **JavaScript** - ES6+ with modern async/await patterns

### AI & Machine Learning
- **LangChain** - RAG (Retrieval-Augmented Generation) pipeline
- **Hugging Face Transformers** - Semantic embeddings (`all-MiniLM-L6-v2`)
- **Google Gemini** - Large language model for intelligent responses
- **Vector Search** - Cosine similarity for semantic document retrieval

### Document Processing
- **PDF.js** - Client-side PDF text extraction
- **Mammoth.js** - DOCX document processing  
- **PapaParse** - CSV parsing and analysis
- **Custom Text Chunking** - Intelligent document segmentation

### Deployment & Infrastructure
- **Vercel** - Serverless hosting with global CDN
- **GitHub** - Source code management
- **Environment Variables** - Secure API key management

## 🧠 How It Works

### 1. Document Upload & Processing
```javascript
// User uploads document → Extract text → Chunk into segments
const chunks = chunkText(extractedText, {
  chunkSize: 1000,
  overlap: 200
});
```

### 2. Vector Embedding Generation
```javascript
// Generate embeddings for each chunk using Hugging Face
const embeddings = await generateBatchEmbeddings(chunks);
// Store in in-memory vector database with metadata
vectorStore.addDocuments(chunks, embeddings, metadata);
```

### 3. Semantic Search
```javascript
// User asks question → Generate query embedding → Find similar chunks
const queryEmbedding = await generateEmbedding(userQuestion);
const relevantChunks = vectorStore.search(queryEmbedding, topK=5);
```

### 4. RAG-Powered Response
```javascript
// Create RAG chain with retrieved context
const ragChain = RunnableSequence.from([
  contextPreparation,    // Format retrieved chunks
  promptTemplate,        // Inject context into prompt
  googleGeminiLLM,      // Generate contextual response
  outputParser          // Clean and format output
]);
```

## 📁 Project Structure

```
ragnarok/frontend/
├── src/
│   ├── components/
│   │   └── SimpleChatbot.jsx          # Chat interface
│   ├── utils/
│   │   ├── simpleFileProcessor.js     # Document processing
│   │   ├── embeddingService.js        # Hugging Face integration
│   │   ├── langchainService.js        # RAG chain implementation
│   │   └── vectorStore.js             # In-memory vector database
│   ├── App.jsx                        # Main application
│   └── main.jsx                       # React entry point
├── public/                            # Static assets
├── dist/                             # Production build
├── .env                              # Environment variables
├── vite.config.js                    # Vite configuration
├── package.json                      # Dependencies
├── Dockerfile                        # Container configuration
├── vercel.json                       # Vercel deployment config
└── README.md                         # This file
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Configure environment variables in Vercel dashboard
```

### Alternative Deployment Options
- **Netlify** - `netlify deploy --prod --dir=dist`
- **Firebase Hosting** - `firebase deploy`
- **GitHub Pages** - Automated with GitHub Actions
- **Google Cloud Run** - Containerized deployment
- **Docker** - `docker build -t ragnarok . && docker run -p 8080:8080 ragnarok`

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [DEPLOY-ALTERNATIVES.md](./DEPLOY-ALTERNATIVES.md) for detailed instructions.

## 🔧 Configuration

### Environment Variables
```env
# AI Provider Configuration
VITE_EMBEDDING_PROVIDER=huggingface      # Options: huggingface, openai
VITE_LLM_PROVIDER=google                 # Options: google, openai

# API Keys
VITE_HUGGINGFACE_API_KEY=hf_xxxx         # Get from https://huggingface.co/settings/tokens
VITE_GOOGLE_API_KEY=AIza_xxxx            # Get from https://console.cloud.google.com/

# Optional: Database Configuration (Future)
VITE_USE_VECTOR_DATABASE=false
VITE_VECTOR_DB_TYPE=pgvector
```

### Customization
```javascript
// Adjust embedding model in embeddingService.js
const EMBEDDING_CONFIG = {
  model: 'sentence-transformers/all-MiniLM-L6-v2',  // Fast, good quality
  // Alternative: 'sentence-transformers/all-mpnet-base-v2'  // Higher quality
};

// Modify chunking strategy in simpleFileProcessor.js
const chunkText = (text, options = {
  chunkSize: 1000,    // Characters per chunk
  overlap: 200,       // Overlap between chunks
  separators: ['\n\n', '\n', '. ', ' ']
});
```

## 📊 Performance & Scalability

### Current Capabilities
- **Documents**: Handles 10-100 documents efficiently in browser memory
- **File Size**: Up to 10MB per document (limited by browser memory)
- **Response Time**: < 2 seconds for most queries
- **Embedding Dimensions**: 384 (MiniLM) for fast similarity search

### Scaling Considerations
For larger deployments, consider:
- **Backend Integration** - Move vector storage to PostgreSQL + pgvector
- **Chunking Optimization** - Implement sliding window and hierarchical chunking
- **Caching Layer** - Cache embeddings and frequent queries
- **Load Balancing** - Distribute AI API calls across multiple keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain** - For the RAG framework and AI orchestration
- **Hugging Face** - For providing excellent open-source embedding models
- **Google Gemini** - For powerful and affordable LLM capabilities
- **Vercel** - For seamless deployment and hosting
- **React & Vite** - For the amazing developer experience

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Documentation**: See `/docs` folder for detailed guides

---

**Built with ❤️ for the AI community**

*Ragnarok - Bringing the power of AI document analysis to everyone*
