#!/bin/bash

# Deploy directly from source using Cloud Run (bypasses Docker registry)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploy from Source to Cloud Run${NC}"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

# Get project number for Container Registry
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>/dev/null || echo "unknown")

echo -e "${GREEN}📋 Using project: ${PROJECT_ID} (${PROJECT_NUMBER})${NC}"

# Build the app first
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Deploy directly from source using Cloud Run
echo -e "${YELLOW}🚀 Deploying from source to Cloud Run...${NC}"
echo -e "${YELLOW}This will build the container in the cloud and deploy automatically${NC}"

gcloud run deploy ragnarok-frontend \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="VITE_EMBEDDING_PROVIDER=huggingface,VITE_LLM_PROVIDER=google,VITE_HUGGINGFACE_API_KEY=$(grep VITE_HUGGINGFACE_API_KEY .env | cut -d'=' -f2),VITE_GOOGLE_API_KEY=$(grep VITE_GOOGLE_API_KEY .env | cut -d'=' -f2)"

echo -e "${GREEN}✅ Deployment completed!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ragnarok-frontend --region=us-central1 --format="value(status.url)" 2>/dev/null)
echo -e "${GREEN}🌐 App URL: ${SERVICE_URL}${NC}"

echo -e "${GREEN}🎉 Your Ragnarok app is now live!${NC}"