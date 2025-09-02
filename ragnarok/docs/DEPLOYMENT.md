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
