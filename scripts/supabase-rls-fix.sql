-- Disable RLS temporarily to fix policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users can insert own payment history" ON public.payment_history;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for profiles
CREATE POLICY "Enable read access for users on own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert access for users on own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update access for users on own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create policies for subscriptions
CREATE POLICY "Enable read access for users on own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users on own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for users on own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create policies for contracts
CREATE POLICY "Enable all access for users on own contracts" ON public.contracts
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for payment_history
CREATE POLICY "Enable read access for users on own payment history" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users on own payment history" ON public.payment_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_metadata JSONB;
  user_email TEXT;
  first_name TEXT;
  last_name TEXT;
BEGIN
  -- Get user metadata and email
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_email := NEW.email;
  
  -- Extract names
  first_name := COALESCE(
    user_metadata->>'nome',
    user_metadata->>'first_name',
    split_part(user_email, '@', 1),
    'Usuário'
  );
  
  last_name := COALESCE(
    user_metadata->>'sobrenome',
    user_metadata->>'last_name',
    ''
  );
  
  -- Insert into profiles table with all metadata
  INSERT INTO public.profiles (
    id, 
    email, 
    tipo_pessoa, 
    nome, 
    sobrenome,
    cpf,
    razao_social,
    nome_fantasia,
    cnpj,
    nome_responsavel,
    whatsapp
  )
  VALUES (
    NEW.id, 
    user_email, 
    COALESCE(user_metadata->>'tipo_pessoa', 'PF'),
    first_name,
    last_name,
    user_metadata->>'cpf',
    user_metadata->>'razao_social',
    user_metadata->>'nome_fantasia',
    user_metadata->>'cnpj',
    user_metadata->>'nome_responsavel',
    user_metadata->>'whatsapp'
  );
  
  -- Insert into subscriptions table
  INSERT INTO public.subscriptions (user_id, plano, status, creditos_simples, creditos_avancados)
  VALUES (
    NEW.id,
    'teste_gratis',
    'active',
    5,
    0
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant additional permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.payment_history TO authenticated;

-- Test message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully!';
END $$;
