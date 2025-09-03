# 🚀 Deploying Ragnarok to Google Cloud

## Prerequisites

1. **Google Cloud CLI**: Install from https://cloud.google.com/sdk/docs/install
2. **Google Cloud Project**: Create a project at https://console.cloud.google.com
3. **Billing**: Enable billing on your Google Cloud project

## Quick Deployment

### 1. Setup Google Cloud
```bash
# Install gcloud CLI (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Configure Environment Variables
The app requires two API keys that are already configured in your `.env` file:

- `VITE_HUGGINGFACE_API_KEY` - For embeddings
- `VITE_GOOGLE_API_KEY` - For LangChain/Gemini

These will be automatically stored as Google Cloud Secrets during deployment.

### 3. Deploy
```bash
# Run the deployment script
./deploy.sh
```

That's it! The script will:
1. ✅ Check prerequisites
2. 🔐 Create Google Cloud Secrets for your API keys
3. 🏗️ Build the Docker container
4. 🚀 Deploy to Cloud Run
5. 🌐 Provide your app URL

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Create Secrets
```bash
# Create Hugging Face API key secret
echo -n "your_hf_api_key" | gcloud secrets create huggingface-api-key --data-file=-

# Create Google API key secret  
echo -n "your_google_api_key" | gcloud secrets create google-api-key --data-file=-
```

### 2. Build and Deploy
```bash
# Build the container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ragnarok-frontend

# Deploy to Cloud Run
gcloud run deploy ragnarok-frontend \
  --image gcr.io/YOUR_PROJECT_ID/ragnarok-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars VITE_EMBEDDING_PROVIDER=huggingface,VITE_LLM_PROVIDER=google \
  --update-secrets VITE_HUGGINGFACE_API_KEY=huggingface-api-key:latest \
  --update-secrets VITE_GOOGLE_API_KEY=google-api-key:latest
```

## Configuration

### Environment Variables
The following environment variables are set in production:

- `VITE_EMBEDDING_PROVIDER=huggingface`
- `VITE_LLM_PROVIDER=google`
- `VITE_HUGGINGFACE_API_KEY` (from secret)
- `VITE_GOOGLE_API_KEY` (from secret)

### Resource Limits
- **Memory**: 512Mi
- **CPU**: 1 vCPU
- **Max Instances**: 10
- **Port**: 8080

## Monitoring

### View Logs
```bash
gcloud logs read --service ragnarok-frontend
```

### Check Status
```bash
gcloud run services describe ragnarok-frontend --region us-central1
```

### Update Deployment
```bash
# Redeploy with changes
gcloud builds submit --config cloudbuild.yaml
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check that all dependencies are properly installed
2. **Environment Variables**: Ensure secrets are created correctly
3. **API Limits**: Monitor your Hugging Face and Google API usage
4. **Memory Issues**: Increase memory allocation if needed

### Update Secrets
```bash
# Update Hugging Face key
echo -n "new_hf_key" | gcloud secrets versions add huggingface-api-key --data-file=-

# Update Google key
echo -n "new_google_key" | gcloud secrets versions add google-api-key --data-file=-

# Redeploy to use new secrets
gcloud run services update ragnarok-frontend --region us-central1
```

## Architecture

```
User -> Cloud Load Balancer -> Cloud Run Container -> 
  ├── Static Files (nginx)
  ├── React App
  ├── Hugging Face API (embeddings)
  └── Google Gemini API (LLM)
```

## Cost Optimization

- **Cloud Run**: Pay per request, scales to zero
- **Container Registry**: Minimal storage costs
- **API Usage**: Monitor Hugging Face and Google API consumption

Your app will be available at: `https://ragnarok-frontend-PROJECT_ID.a.run.app`