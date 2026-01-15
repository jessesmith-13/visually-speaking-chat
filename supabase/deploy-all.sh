#!/bin/bash

# ============================================
# Visually Speaking - Deploy All Edge Functions
# ============================================

# Strict error handling
set -euo pipefail

echo "🚀 Deploying all Edge Functions..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if authenticated
if ! supabase projects list &> /dev/null
then
    echo -e "${RED}❌ Not logged in to Supabase${NC}"
    echo "Run: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Supabase${NC}"
echo ""

# Deploy functions in consistent order
# All functions require authentication (no --no-verify-jwt flag)
FUNCTIONS=(
  "send-email"
  "admin-operations"
  "tickets"
  "matchmaking"
  "events"
  "stripe-webhook"
  "stripe-create-payment-intent"
)

echo -e "${BLUE}🔐 All functions require JWT authentication${NC}"
echo ""

DEPLOYED_COUNT=0
FAILED_COUNT=0

for func in "${FUNCTIONS[@]}"
do
    echo -e "${YELLOW}📤 Deploying ${func}...${NC}"
    
    # Deploy without --no-verify-jwt (secure by default)
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo -e "${GREEN}✅ ${func} deployed successfully${NC}"
        ((DEPLOYED_COUNT++))
    else
        echo -e "${RED}❌ Failed to deploy ${func}${NC}"
        ((FAILED_COUNT++))
        exit 1
    fi
    
    echo ""
done

echo ""
echo -e "${GREEN}🎉 All functions deployed successfully!${NC}"
echo -e "${GREEN}   Deployed: ${DEPLOYED_COUNT} functions${NC}"
echo ""

# Show deployed functions
echo -e "${BLUE}📋 Deployed Functions:${NC}"
supabase functions list

echo ""
echo -e "${YELLOW}⚙️  Configuration Checklist:${NC}"
echo ""
echo "1. Set environment secrets (if not already set):"
echo "   supabase secrets set RESEND_API_KEY=re_..."
echo "   supabase secrets set STRIPE_SECRET_KEY=sk_test_..."
echo ""
echo "2. Verify secrets are set:"
echo "   supabase secrets list"
echo ""
echo "3. Check function logs:"
echo "   supabase functions logs <function-name>"
echo ""
echo "4. Test endpoints (requires authentication):"
echo "   All endpoints require Authorization: Bearer <token> header"
echo ""
