-- ============================================
-- INFLUENCER DASHBOARD - SUPABASE SQL SCHEMA
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'campaign_manager'
    CHECK (role IN ('admin', 'campaign_manager', 'accountant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  iban TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid')),
  notes TEXT DEFAULT '',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL DEFAULT 0,
  transfer_ref TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update only their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (true);

-- Campaigns: all authenticated users can read; managers/admins can write
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE TO authenticated USING (true);

-- Influencers: all authenticated users can read/write
CREATE POLICY "influencers_select" ON public.influencers FOR SELECT TO authenticated USING (true);
CREATE POLICY "influencers_insert" ON public.influencers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "influencers_update" ON public.influencers FOR UPDATE TO authenticated USING (true);

-- Receipts: all authenticated users can read/write
CREATE POLICY "receipts_select" ON public.receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "receipts_insert" ON public.receipts FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'campaign_manager')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
