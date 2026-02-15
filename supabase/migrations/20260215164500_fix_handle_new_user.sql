-- Migration to fix handle_new_user trigger with robust error handling and pharmacy_id support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, pharmacy_id, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NULLIF(NEW.raw_user_meta_data->>'pharmacy_id', '')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    pharmacy_id = EXCLUDED.pharmacy_id,
    phone = EXCLUDED.phone;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
