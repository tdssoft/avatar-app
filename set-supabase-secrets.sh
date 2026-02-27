#!/bin/bash

# =====================================================
# Supabase Edge Functions - Set Environment Variables
# =====================================================
# This script sets all required environment variables
# for Supabase Edge Functions (email notifications)
# =====================================================

echo "╔════════════════════════════════════════════════╗"
echo "║  Setting Supabase Edge Functions Secrets      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

PROJECT_REF="llrmskcwsfmubooswatz"

echo "📝 Setting secrets for project: $PROJECT_REF"
echo ""

# Set Resend API Key
echo "🔑 Setting RESEND_API_KEY..."
supabase secrets set RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE --project-ref $PROJECT_REF

# Set Email Configuration
echo "📧 Setting RESEND_FROM_EMAIL..."
supabase secrets set "RESEND_FROM_EMAIL=AVATAR <onboarding@resend.dev>" --project-ref $PROJECT_REF

echo "📧 Setting RESEND_REPLY_TO..."
supabase secrets set RESEND_REPLY_TO=avatarmieszek@gmail.com --project-ref $PROJECT_REF

echo "📧 Setting ADMIN_EMAIL..."
supabase secrets set ADMIN_EMAIL=avatarmieszek@gmail.com --project-ref $PROJECT_REF

echo "🌐 Setting APP_URL..."
supabase secrets set APP_URL=https://app.eavatar.diet --project-ref $PROJECT_REF

# Set Supabase URLs for edge functions
echo "🔗 Setting SUPABASE_URL..."
supabase secrets set SUPABASE_URL=https://kong-production-d36f.up.railway.app --project-ref $PROJECT_REF

echo "🔗 Setting SUPABASE_ANON_KEY..."
supabase secrets set SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY --project-ref $PROJECT_REF

echo "🔑 Setting SUPABASE_SERVICE_ROLE_KEY..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY --project-ref $PROJECT_REF

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Secrets Set Successfully! ✓                  ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📋 To verify secrets were set:"
echo "   supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "🚀 To deploy edge functions:"
echo "   supabase functions deploy --project-ref $PROJECT_REF"
echo ""
