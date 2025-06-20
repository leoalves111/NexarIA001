-- Fix the trigger function to work properly
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    tipo_pessoa = EXCLUDED.tipo_pessoa,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    cpf = EXCLUDED.cpf,
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    cnpj = EXCLUDED.cnpj,
    nome_responsavel = EXCLUDED.nome_responsavel,
    whatsapp = EXCLUDED.whatsapp,
    updated_at = NOW();
  
  -- Insert into subscriptions table
  INSERT INTO public.subscriptions (user_id, plano, status, creditos_simples, creditos_avancados, data_expiracao)
  VALUES (
    NEW.id,
    'teste_gratis',
    'active',
    5,
    0,
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plano = EXCLUDED.plano,
    status = EXCLUDED.status,
    creditos_simples = EXCLUDED.creditos_simples,
    creditos_avancados = EXCLUDED.creditos_avancados,
    data_expiracao = EXCLUDED.data_expiracao,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add unique constraint to subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_user_id_key' 
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Test message
DO $$
BEGIN
  RAISE NOTICE 'Trigger function updated successfully with ON CONFLICT handling!';
END $$;
