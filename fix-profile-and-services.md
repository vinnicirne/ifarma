# Task: Deep Dive and Fix Profile & Related Services

## Problem Description
- Error when saving profile: `Could not find the 'latitude' column of 'profiles' in the schema cache`.
- User requested a "deep dive" into the profile and "buggy services".

## Findings
- `profiles` table is missing several columns that the frontend expects (`address`, `number`, `complement`, `latitude`, `longitude`).
- `avatars` bucket and policies are missing in migrations (profile photo upload might fail).
- `user_addresses` table is mentioned in code but missing from migrations.

## Proposed Changes

### Phase 1: Database Schema Alignment
1. **Add missing columns to `profiles`**:
   - `address` (text)
   - `number` (text)
   - `complement` (text)
   - `latitude` (double precision)
   - `longitude` (double precision)
2. **Create `user_addresses` table**:
   - `id` (uuid, pk)
   - `user_id` (uuid, fk to profiles)
   - `name` (text)
   - `street` (text)
   - `number` (text)
   - `complement` (text)
   - `latitude` (double precision)
   - `longitude` (double precision)
   - `is_default` (boolean)
   - `created_at` (timestamptz)

### Phase 2: Storage Configuration
1. **Create `avatars` bucket**.
2. **Set RLS policies for `avatars`**:
   - Public read.
   - Authenticated insert/update/delete for own folder.

### Phase 3: Frontend Refinement (If needed)
1. Verify `UserProfile.tsx` coordinate handling.

## Verification Plan
1. Apply SQL migrations.
2. Test profile saving with address search.
3. Test photo upload.
4. Test adding an additional address.
