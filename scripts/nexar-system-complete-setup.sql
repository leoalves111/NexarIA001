-- ======================================================================
-- NEXAR IA - SISTEMA COMPLETO OTIMIZADO v2.0
-- Script SQL final unificado para Supabase
-- Migração completa para GPT-4o-mini avançado + Otimizações
-- ======================================================================

-- ⚡ PERFORMANCE: Executar em uma única transação
BEGIN;

-- 🧹 1. LIMPEZA INICIAL (Remover políticas e triggers conflitantes)
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
DROP POLICY IF EXISTS "users_can_manage_advanced_contracts" ON public.contracts;
DROP POLICY IF EXISTS "users_can_read_own_credit_logs" ON public.credit_logs;

-- Remover triggers antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_advanced_subscription ON auth.users;
DROP TRIGGER IF EXISTS ensure_advanced_contract_type ON public.contracts;
DROP TRIGGER IF EXISTS validate_credits_trigger ON public.subscriptions;

-- 🏗️ 2. CRIAÇÃO/ATUALIZAÇÃO DE TABELAS
-- Tabela profiles (atualizada)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')) NOT NULL DEFAULT 'PF',
  nome VARCHAR(200) NOT NULL,
  sobrenome VARCHAR(200),
  cpf VARCHAR(14),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18),
  nome_responsavel VARCHAR(200),
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela subscriptions (MIGRADA PARA SISTEMA AVANÇADO)
DO $$
BEGIN
    -- Verificar se existe coluna creditos_simples e converter
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'subscriptions' AND column_name = 'creditos_simples') THEN
        -- Converter créditos simples para avançados (2:1)
        UPDATE public.subscriptions 
        SET creditos_avancados = COALESCE(creditos_avancados, 0) + COALESCE(creditos_simples, 0) / 2
        WHERE creditos_simples > 0;
        
        -- Remover coluna antiga
        ALTER TABLE public.subscriptions DROP COLUMN creditos_simples;
        
        RAISE NOTICE '✅ Créditos simples convertidos para avançados com sucesso!';
    END IF;
END $$;

-- Criar/atualizar tabela subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plano VARCHAR(50) NOT NULL DEFAULT 'teste_gratis',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  creditos_avancados INTEGER NOT NULL DEFAULT 10,
  data_expiracao TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela contracts (MIGRADA PARA SISTEMA AVANÇADO)
DO $$
BEGIN
    -- Converter contratos simples para avançados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        UPDATE public.contracts 
        SET tipo = 'avancado' 
        WHERE tipo = 'simples';
        
        RAISE NOTICE '✅ Contratos convertidos para tipo avançado!';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(20) CHECK (tipo = 'avancado') NOT NULL DEFAULT 'avancado',
  conteudo TEXT,
  status VARCHAR(20) DEFAULT 'gerado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela payment_history (otimizada)
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  tipo VARCHAR(50) NOT NULL,
  gateway VARCHAR(30),
  transaction_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🚀 3. NOVAS TABELAS OTIMIZADAS
-- Tabela de logs de créditos para auditoria
CREATE TABLE IF NOT EXISTS public.credit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    previous_credits INTEGER,
    new_credits INTEGER,
    change_reason VARCHAR(100),
    change_amount INTEGER GENERATED ALWAYS AS (new_credits - previous_credits) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cache de contratos para performance
DO $$
BEGIN
    -- Criar tabela se não existir
    CREATE TABLE IF NOT EXISTS public.contract_cache (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prompt_hash VARCHAR(64) NOT NULL UNIQUE,
        prompt_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        contract_type VARCHAR(20) DEFAULT 'avancado',
        temperature DECIMAL(3,2) DEFAULT 0.2,
        tokens_used INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Adicionar coluna expires_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contract_cache' AND column_name = 'expires_at') THEN
        ALTER TABLE public.contract_cache 
        ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes');
        
        RAISE NOTICE '✅ Coluna expires_at adicionada à tabela contract_cache!';
    END IF;
END $$;

-- Tabela de templates de contratos
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_html TEXT NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔐 4. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- 🛡️ 5. POLÍTICAS RLS OTIMIZADAS E SEGURAS
-- Profiles
CREATE POLICY "profiles_own_data" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subscriptions
CREATE POLICY "subscriptions_own_data" ON public.subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contracts (apenas avançados)
CREATE POLICY "contracts_advanced_only" ON public.contracts
    FOR ALL USING (auth.uid() = user_id AND tipo = 'avancado') 
    WITH CHECK (auth.uid() = user_id AND tipo = 'avancado');

-- Payment History
CREATE POLICY "payment_history_own_data" ON public.payment_history
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credit Logs (apenas leitura para usuários)
CREATE POLICY "credit_logs_read_own" ON public.credit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Contract Cache (público para leitura, sistema para escrita)
CREATE POLICY "contract_cache_public_read" ON public.contract_cache
    FOR SELECT TO authenticated USING (expires_at > NOW());

CREATE POLICY "contract_cache_system_write" ON public.contract_cache
    FOR INSERT TO authenticated WITH CHECK (true);

-- Contract Templates (público para leitura)
CREATE POLICY "contract_templates_public_read" ON public.contract_templates
    FOR SELECT TO authenticated USING (is_active = true);

-- 🔧 6. FUNÇÕES OTIMIZADAS
-- Função para criar usuário com sistema avançado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_metadata JSONB;
    user_email TEXT;
    display_name TEXT;
BEGIN
    -- Obter metadados do usuário
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    user_email := COALESCE(NEW.email, '');
    display_name := COALESCE(
        user_metadata->>'nome',
        user_metadata->>'first_name',
        split_part(user_email, '@', 1),
        'Usuário'
    );
    
    -- Inserir perfil
    INSERT INTO public.profiles (
        id, email, tipo_pessoa, nome, sobrenome,
        cpf, razao_social, nome_fantasia, cnpj, 
        nome_responsavel, whatsapp
    ) VALUES (
        NEW.id, user_email, 
        COALESCE(user_metadata->>'tipo_pessoa', 'PF'),
        display_name,
        COALESCE(user_metadata->>'sobrenome', user_metadata->>'last_name', ''),
        user_metadata->>'cpf',
        user_metadata->>'razao_social',
        user_metadata->>'nome_fantasia',
        user_metadata->>'cnpj',
        user_metadata->>'nome_responsavel',
        user_metadata->>'whatsapp'
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Inserir assinatura com CRÉDITOS AVANÇADOS
    INSERT INTO public.subscriptions (
        user_id, plano, status, creditos_avancados, data_expiracao
    ) VALUES (
        NEW.id, 'teste_gratis', 'active', 10, -- 10 créditos GPT-4o-mini
        NOW() + INTERVAL '30 days'
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log erro mas não falha criação do usuário
        RAISE WARNING 'Erro ao criar dados do usuário %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Função para validar e atualizar créditos
CREATE OR REPLACE FUNCTION public.handle_credits_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Garantir que créditos nunca sejam negativos
    IF NEW.creditos_avancados < 0 THEN
        NEW.creditos_avancados = 0;
    END IF;
    
    -- Log da alteração se houve mudança
    IF OLD.creditos_avancados IS DISTINCT FROM NEW.creditos_avancados THEN
        INSERT INTO public.credit_logs (
            user_id, previous_credits, new_credits, change_reason
        ) VALUES (
            NEW.user_id, 
            OLD.creditos_avancados, 
            NEW.creditos_avancados,
            CASE 
                WHEN NEW.creditos_avancados > OLD.creditos_avancados THEN 'credit_added'
                WHEN NEW.creditos_avancados < OLD.creditos_avancados THEN 'credit_used'
                ELSE 'credit_adjusted'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Função para garantir contratos apenas avançados
CREATE OR REPLACE FUNCTION public.ensure_advanced_contract()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Forçar tipo avançado
    NEW.tipo = 'avancado';
    
    -- Validar se usuário tem créditos
    IF NOT EXISTS (
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = NEW.user_id 
        AND creditos_avancados > 0 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Créditos GPT-4o-mini insuficientes para gerar contrato avançado';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Função para limpeza automática de cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se a coluna expires_at existe antes de tentar usar
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'contract_cache' AND column_name = 'expires_at') THEN
        DELETE FROM public.contract_cache 
        WHERE expires_at < NOW();
    END IF;
END;
$$;

-- 🎯 7. TRIGGERS OTIMIZADOS
-- Trigger para novos usuários
CREATE TRIGGER create_user_advanced_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger para validação de créditos
CREATE TRIGGER validate_credits_update
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_credits_update();

-- Trigger para garantir contratos avançados
CREATE TRIGGER ensure_advanced_contracts_only
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_advanced_contract();

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER contracts_updated_at 
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 🚀 8. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_credits ON public.subscriptions(creditos_avancados) WHERE creditos_avancados > 0;
CREATE INDEX IF NOT EXISTS idx_contracts_user_created ON public.contracts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_status ON public.payment_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_logs_user_created ON public.credit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_cache_hash ON public.contract_cache(prompt_hash);
-- Criar índice para expires_at apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'contract_cache' AND column_name = 'expires_at') THEN
        CREATE INDEX IF NOT EXISTS idx_contract_cache_expires ON public.contract_cache(expires_at);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON public.contract_templates(is_active, category);

-- 🎨 9. INSERIR TEMPLATES PADRÃO
INSERT INTO public.contract_templates (name, description, template_html, category) VALUES
('Prestação de Serviços Profissional', 'Template profissional para contratos de serviços', 
'<div class="contract-professional">{{content}}</div>', 'servicos'),
('Contrato de Trabalho Moderno', 'Template moderno para contratos de trabalho', 
'<div class="contract-modern">{{content}}</div>', 'trabalho'),
('Locação Executiva', 'Template executivo para contratos de locação', 
'<div class="contract-executive">{{content}}</div>', 'locacao'),
('Compra e Venda Premium', 'Template premium para contratos de compra e venda', 
'<div class="contract-premium">{{content}}</div>', 'compra_venda')
ON CONFLICT DO NOTHING;

-- 🔒 10. PERMISSÕES FINAIS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 📊 11. ESTATÍSTICAS FINAIS
DO $$
DECLARE
    total_users INTEGER;
    total_credits INTEGER;
    total_contracts INTEGER;
    avg_credits NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_users FROM public.profiles;
    SELECT SUM(creditos_avancados) INTO total_credits FROM public.subscriptions;
    SELECT COUNT(*) INTO total_contracts FROM public.contracts;
    SELECT AVG(creditos_avancados) INTO avg_credits FROM public.subscriptions;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 =============================================';
    RAISE NOTICE '🚀 NEXAR IA - SISTEMA OTIMIZADO INSTALADO!';
    RAISE NOTICE '⚡ Migração para GPT-4o-mini concluída!';
    RAISE NOTICE '📊 Estatísticas:';
    RAISE NOTICE '   👥 Usuários: %', COALESCE(total_users, 0);
    RAISE NOTICE '   🪙 Total Créditos Avançados: %', COALESCE(total_credits, 0);
    RAISE NOTICE '   📄 Contratos: %', COALESCE(total_contracts, 0);
    RAISE NOTICE '   📈 Média de Créditos: %', ROUND(COALESCE(avg_credits, 0), 2);
    RAISE NOTICE '🎯 Sistema 100%% otimizado e funcionando!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';
END $$;

-- ✅ COMMIT FINAL
COMMIT;

-- 🔄 CONFIGURAR LIMPEZA AUTOMÁTICA (executar separadamente)
-- SELECT cron.schedule('cleanup-contract-cache', '*/30 * * * *', 'SELECT public.cleanup_expired_cache();');

-- 🎊 FIM DO SCRIPT
-- Execute este script no SQL Editor do Supabase
-- Sistema totalmente otimizado para GPT-4o-mini avançado! 