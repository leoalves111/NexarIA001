-- Verificar se as tabelas existem e criar se necessário
DO $$ 
BEGIN
    -- Criar tabela profiles se não existir
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PF',
            nome VARCHAR(100),
            sobrenome VARCHAR(100),
            cpf VARCHAR(14),
            razao_social VARCHAR(200),
            nome_fantasia VARCHAR(200),
            cnpj VARCHAR(18),
            nome_responsavel VARCHAR(100),
            email VARCHAR(255) NOT NULL,
            whatsapp VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Criar tabela subscriptions se não existir
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE TABLE subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            plano VARCHAR(50) NOT NULL DEFAULT 'teste_gratis',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            creditos_simples INTEGER DEFAULT 0,
            creditos_avancados INTEGER DEFAULT 0,
            data_expiracao TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Habilitar RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

    -- Políticas para profiles
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    CREATE POLICY "Users can view own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    CREATE POLICY "Users can insert own profile" ON profiles
        FOR INSERT WITH CHECK (auth.uid() = id);

    -- Políticas para subscriptions
    DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
    CREATE POLICY "Users can view own subscription" ON subscriptions
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
    CREATE POLICY "Users can update own subscription" ON subscriptions
        FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
    CREATE POLICY "Users can insert own subscription" ON subscriptions
        FOR INSERT WITH CHECK (auth.uid() = user_id);

END $$;
