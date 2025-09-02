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
