#!/bin/bash
# Verify .env.example matches all environment variables used in code

set -e

echo "=== Environment Variable Verification ==="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check_var() {
    local var="$1"
    local category="$2"
    if grep -q "^${var}=" .env.example 2>/dev/null || grep -q "^# ${var}=" .env.example 2>/dev/null; then
        echo -e "${GREEN}✓${NC} ${var} (${category}) - Found in .env.example"
        return 0
    else
        echo -e "${RED}✗${NC} ${var} (${category}) - MISSING from .env.example"
        return 1
    fi
}

echo "Checking client-side variables..."
MISSING=0

for var in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_USE_MOCKS EXPO_PUBLIC_PROJECT_ID EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; do
    if ! check_var "$var" "Client"; then
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Checking server-side variables..."
for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET PAYPAL_ENV; do
    if ! check_var "$var" "Server"; then
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Scanning for committed secrets..."
FOUND=0
if git grep -En '(sb_secret_[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]{20,}|pk_live_[A-Za-z0-9]{20,})' -- ':!*.example' ':!*.env' ':!node_modules/**' 2>/dev/null; then
    echo -e "${RED}✗${NC} Found potential committed secret value"
    FOUND=1
fi

if git grep -En '(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|PAYPAL_CLIENT_SECRET)=([^[:space:]#].*)' -- ':!*.example' ':!*.env' ':!node_modules/**' 2>/dev/null; then
    echo -e "${RED}✗${NC} Found secret-like assignment outside ignored env files"
    FOUND=1
fi

if [ $FOUND -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No committed secrets found"
fi

echo ""
if [ $MISSING -gt 0 ] || [ $FOUND -gt 0 ]; then
    echo -e "${RED}FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}PASSED${NC}"
    exit 0
fi
