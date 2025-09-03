#!/bin/bash

# Simple deployment script for Ragnarok (manual approach)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Simple Ragnarok Deployment${NC}"

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

echo -e "${GREEN}📋 Using project: ${PROJECT_ID}${NC}"

# Build locally first
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Build Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker build -t ragnarok-frontend .

# Tag for Google Container Registry
docker tag ragnarok-frontend gcr.io/$PROJECT_ID/ragnarok-frontend:latest

# Configure Docker to use gcloud credentials for Container Registry
echo -e "${YELLOW}🔐 Configuring Docker authentication...${NC}"
gcloud auth configure-docker gcr.io --quiet

# Push to Container Registry
echo -e "${YELLOW}📦 Pushing image to Container Registry...${NC}"
docker push gcr.io/$PROJECT_ID/ragnarok-frontend:latest

# Deploy to Cloud Run (with minimal permissions)
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ragnarok-frontend \
  --image=gcr.io/$PROJECT_ID/ragnarok-frontend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="VITE_EMBEDDING_PROVIDER=huggingface,VITE_LLM_PROVIDER=google,VITE_HUGGINGFACE_API_KEY=$(grep VITE_HUGGINGFACE_API_KEY .env | cut -d'=' -f2),VITE_GOOGLE_API_KEY=$(grep VITE_GOOGLE_API_KEY .env | cut -d'=' -f2)"

echo -e "${GREEN}✅ Deployment completed!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ragnarok-frontend --region=us-central1 --format="value(status.url)" 2>/dev/null || echo "Run the following to get URL: gcloud run services list")
echo -e "${GREEN}🌐 App URL: ${SERVICE_URL}${NC}"