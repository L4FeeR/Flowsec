#!/bin/bash

# Deploy VirusTotal Proxy Edge Function to Supabase
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Deploying VirusTotal Proxy Edge Function to Supabase"
echo "=================================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📥 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Set the VirusTotal API key secret
echo ""
echo "🔐 Setting VirusTotal API key as secret..."
supabase secrets set VIRUSTOTAL_API_KEY=8a2a9809b18ab04dc168df26000af4490beeaf2d4a42e1b90f1989b23d2bb630

# Deploy the function
echo ""
echo "📤 Deploying virustotal-scan function..."
supabase functions deploy virustotal-scan --no-verify-jwt

# Success message
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your VirusTotal proxy is now available at:"
echo "   https://xqgaheblnueignmymdhz.supabase.co/functions/v1/virustotal-scan"
echo ""
echo "📊 Monitor logs with:"
echo "   supabase functions logs virustotal-scan --tail"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl https://xqgaheblnueignmymdhz.supabase.co/functions/v1/virustotal-scan"
echo ""
