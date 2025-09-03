#!/bin/bash

# Deployment script for Ragnarok to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Ragnarok to Google Cloud Run${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Please run: gcloud auth login${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Using project: ${PROJECT_ID}${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create secrets for API keys (if they don't exist)
echo -e "${YELLOW}🔐 Setting up secrets...${NC}"

# Check if secrets exist, create if they don't
if ! gcloud secrets describe huggingface-api-key >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating Hugging Face API key secret...${NC}"
    echo -n "$(grep VITE_HUGGINGFACE_API_KEY .env | cut -d'=' -f2)" | gcloud secrets create huggingface-api-key --data-file=-
fi

if ! gcloud secrets describe google-api-key >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating Google API key secret...${NC}"
    echo -n "$(grep VITE_GOOGLE_API_KEY .env | cut -d'=' -f2)" | gcloud secrets create google-api-key --data-file=-
fi

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️  Building and deploying...${NC}"
gcloud builds submit --config cloudbuild.yaml

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Your app should be available at: https://ragnarok-frontend-PROJECT_ID.a.run.app${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ragnarok-frontend --region=us-central1 --format="value(status.url)")
echo -e "${GREEN}🎉 App URL: ${SERVICE_URL}${NC}"