# Database Migration Guide

## Overview

This migration contains the complete database schema for the Avatar App, consolidating all existing migrations into a single comprehensive migration file.

## Migration Contents

### Database Objects Created

#### Tables (15)
1. **profiles** - User profile information
2. **user_roles** - User role assignments (admin/user)
3. **patients** - Patient records for admin management
4. **person_profiles** - Multi-profile support (family members)
5. **referrals** - Referral tracking system
6. **user_results** - Metadata for uploaded medical results
7. **recommendations** - Medical recommendations and treatment plans
8. **recommendation_access_log** - Access tracking for recommendations
9. **patient_notes** - Admin notes for patients
10. **patient_messages** - Communication between admin and patients
11. **partner_shop_links** - Partner store links
12. **nutrition_interviews** - Nutrition questionnaires
13. **nutrition_interview_history** - Version history for interviews
14. **audio_recordings** - Audio file metadata
15. **support_tickets** - Customer support tickets

#### Storage Buckets (3)
- **avatars** - Profile pictures (public)
- **results** - Medical results (private)
- **audio-recordings** - Audio files (private)

#### Types
- **app_role** - ENUM ('admin', 'user')

#### Functions
- **update_updated_at_column()** - Automatic timestamp updates
- **has_role()** - Role checking function

#### Security
- Row Level Security (RLS) enabled on all tables
- Comprehensive RLS policies for:
  - User data isolation
  - Admin access control
  - Storage bucket access control

## How to Run the Migration

### Option 1: Using Node.js (Recommended)

```bash
# Install dependencies (if not already installed)
npm install pg

# Run the migration
node run-migration.js
```

### Option 2: Using the Migration Script

```bash
# Make the script executable
chmod +x migrate.sh

# Run the migration script
./migrate.sh
```

The script will prompt you to choose a migration method:
1. Docker (recommended if Docker is running)
2. psql (if PostgreSQL client is installed)
3. Node.js (uses pg package)

### Option 3: Using Supabase CLI

```bash
# Link your project (if not already linked)
supabase link --project-ref llrmskcwsfmubooswatz

# Apply the migration
supabase db push
```

### Option 4: Manual Migration

If you prefer to apply the migration manually:

1. Connect to your database using your preferred PostgreSQL client
2. Open `supabase/migrations/20260208000000_complete_database_schema.sql`
3. Execute the SQL file

## Database Connection Details

The migration connects to:
- **Host**: trolley.proxy.rlwy.net
- **Port**: 31136
- **Database**: postgres
- **User**: supabase_admin

Connection string format:
```
postgresql://supabase_admin:[password]@trolley.proxy.rlwy.net:31136/postgres
```

## Verification

After running the migration, verify that:

1. All 15 tables are created
2. All indexes are in place
3. RLS policies are active
4. Storage buckets are configured
5. Triggers are functioning

Run this query to verify tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- audio_recordings
- nutrition_interview_history
- nutrition_interviews
- partner_shop_links
- patient_messages
- patient_notes
- patients
- person_profiles
- profiles
- recommendation_access_log
- recommendations
- referrals
- support_tickets
- user_results
- user_roles

## Rollback

If you need to rollback this migration, you can drop all objects:

```sql
-- WARNING: This will delete all data!
-- Only run this if you need to start fresh

DROP TABLE IF EXISTS public.audio_recordings CASCADE;
DROP TABLE IF EXISTS public.nutrition_interview_history CASCADE;
DROP TABLE IF EXISTS public.nutrition_interviews CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.partner_shop_links CASCADE;
DROP TABLE IF EXISTS public.patient_messages CASCADE;
DROP TABLE IF EXISTS public.patient_notes CASCADE;
DROP TABLE IF EXISTS public.recommendation_access_log CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;
DROP TABLE IF EXISTS public.person_profiles CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.user_results CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

DROP TYPE IF EXISTS public.app_role;

DELETE FROM storage.buckets WHERE id IN ('avatars', 'results', 'audio-recordings');
```

## Troubleshooting

### Migration Fails with "relation already exists"

This means some objects already exist. You have two options:

1. **Skip existing objects** (recommended): The migration uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` where possible
2. **Clean database**: Drop existing objects before running the migration

### Connection Timeout

If you experience connection timeouts:
- Check your internet connection
- Verify the database is accessible
- Check Railway service status

### Permission Errors

Ensure you're using the `supabase_admin` user with the correct password from your credentials.

## Files Created

1. **supabase/migrations/20260208000000_complete_database_schema.sql** - Complete migration file
2. **migrate.sh** - Interactive migration script
3. **run-migration.js** - Node.js migration runner
4. **MIGRATION_README.md** - This documentation file

## Next Steps

After successful migration:

1. Test the application to ensure all features work
2. Verify RLS policies are correctly enforcing access control
3. Check that storage buckets are properly configured
4. Test user registration and profile creation
5. Verify admin functions work correctly

## Support

If you encounter any issues with the migration:
1. Check the error messages carefully
2. Verify database credentials
3. Ensure network connectivity to Railway
4. Review the migration SQL file for any conflicts

---

**Migration Version**: 20260208000000
**Generated**: 2026-02-08
**Database**: PostgreSQL (Supabase/Railway)
