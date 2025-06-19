-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')) NOT NULL,
  nome VARCHAR(255),
  sobrenome VARCHAR(255),
  cpf VARCHAR(14),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18),
  nome_responsavel VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plano VARCHAR(50) DEFAULT 'teste_gratis',
  status VARCHAR(20) DEFAULT 'active',
  creditos_simples INTEGER DEFAULT 5,
  creditos_avancados INTEGER DEFAULT 0,
  data_expiracao TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('simples', 'avancado')) NOT NULL,
  conteudo TEXT,
  status VARCHAR(20) DEFAULT 'gerado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  tipo VARCHAR(50) NOT NULL,
  gateway VARCHAR(20),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deleted_accounts table
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  motivo TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
