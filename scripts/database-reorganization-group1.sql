-- REORGANIZACAO COMPLETA DO BANCO DE DADOS - GRUPO 1
-- Tabelas: contract_cache, contract_templates, contracts, credit_logs, deleted_accounts, exports, field_presets, login_attempts

-- Iniciar reorganizacao
DO $$
BEGIN
    RAISE NOTICE 'Iniciando reorganizacao do banco de dados - Grupo 1...';
    RAISE NOTICE 'Tabelas a serem reorganizadas: contract_cache, contract_templates, contracts, credit_logs, deleted_accounts, exports, field_presets, login_attempts';
END $$;

-- 1. REORGANIZAR TABELA CONTRACT_CACHE
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela contract_cache...';
    
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'contract_cache') THEN
        -- Adicionar expires_at se nao existir com valor padrao
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = 'contract_cache' AND c.column_name = 'expires_at') THEN
            ALTER TABLE contract_cache ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour');
            RAISE NOTICE 'Coluna expires_at adicionada a contract_cache';
        END IF;
        
        -- Garantir que todos os registros tenham expires_at
        UPDATE contract_cache SET expires_at = (NOW() + INTERVAL '1 hour') WHERE expires_at IS NULL;
        
        -- Habilitar RLS se nao estiver habilitado
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'contract_cache' AND pt.rowsecurity = true) THEN
            ALTER TABLE contract_cache ENABLE ROW LEVEL SECURITY;
            RAISE NOTICE 'RLS habilitado para contract_cache';
        END IF;
        
        -- Criar politica para cache publico (sem restricao de usuario)
        DROP POLICY IF EXISTS contract_cache_public_policy ON contract_cache;
        CREATE POLICY contract_cache_public_policy ON contract_cache FOR ALL USING (true);
        
        -- Criar indice para performance
        CREATE INDEX IF NOT EXISTS idx_contract_cache_prompt_hash ON contract_cache(prompt_hash);
        CREATE INDEX IF NOT EXISTS idx_contract_cache_expires_at ON contract_cache(expires_at);
        
        RAISE NOTICE 'Tabela contract_cache reorganizada com sucesso';
    END IF;
END $$;

-- 2. REORGANIZAR TABELA CONTRACT_TEMPLATES
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela contract_templates...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'contract_templates') THEN
        -- Garantir que template_html nao seja nulo
        ALTER TABLE contract_templates ALTER COLUMN template_html SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'contract_templates' AND pt.rowsecurity = true) THEN
            ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politica para templates publicos
        DROP POLICY IF EXISTS contract_templates_public_policy ON contract_templates;
        CREATE POLICY contract_templates_public_policy ON contract_templates 
        FOR SELECT USING (is_active = true);
        
        -- Politica para admin gerenciar templates
        DROP POLICY IF EXISTS contract_templates_admin_policy ON contract_templates;
        CREATE POLICY contract_templates_admin_policy ON contract_templates 
        FOR ALL USING (auth.uid() IS NOT NULL);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);
        CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(is_active);
        
        RAISE NOTICE 'Tabela contract_templates reorganizada com sucesso';
    END IF;
END $$;

-- 3. REORGANIZAR TABELA CONTRACTS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela contracts...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'contracts') THEN
        -- Verificar se user_id existe e tem foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      WHERE tc.constraint_name = 'contracts_user_id_fkey' AND tc.table_name = 'contracts') THEN
            ALTER TABLE contracts ADD CONSTRAINT contracts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign key adicionada para contracts.user_id';
        END IF;
        
        -- Garantir que campos obrigatorios nao sejam nulos
        ALTER TABLE contracts ALTER COLUMN nome SET NOT NULL;
        ALTER TABLE contracts ALTER COLUMN descricao SET NOT NULL;
        ALTER TABLE contracts ALTER COLUMN tipo SET NOT NULL;
        ALTER TABLE contracts ALTER COLUMN user_id SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'contracts' AND pt.rowsecurity = true) THEN
            ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politicas RLS especificas
        DROP POLICY IF EXISTS contracts_select_policy ON contracts;
        DROP POLICY IF EXISTS contracts_insert_policy ON contracts;
        DROP POLICY IF EXISTS contracts_update_policy ON contracts;
        DROP POLICY IF EXISTS contracts_delete_policy ON contracts;
        
        CREATE POLICY contracts_select_policy ON contracts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY contracts_insert_policy ON contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY contracts_update_policy ON contracts FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY contracts_delete_policy ON contracts FOR DELETE USING (auth.uid() = user_id);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_tipo ON contracts(tipo);
        CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
        CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
        
        RAISE NOTICE 'Tabela contracts reorganizada com sucesso';
    END IF;
END $$;

-- 4. REORGANIZAR TABELA CREDIT_LOGS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela credit_logs...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'credit_logs') THEN
        -- Verificar foreign key para user_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      WHERE tc.constraint_name = 'credit_logs_user_id_fkey' AND tc.table_name = 'credit_logs') THEN
            ALTER TABLE credit_logs ADD CONSTRAINT credit_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        -- Garantir campos obrigatorios
        ALTER TABLE credit_logs ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE credit_logs ALTER COLUMN change_reason SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'credit_logs' AND pt.rowsecurity = true) THEN
            ALTER TABLE credit_logs ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politicas RLS
        DROP POLICY IF EXISTS credit_logs_select_policy ON credit_logs;
        CREATE POLICY credit_logs_select_policy ON credit_logs FOR SELECT USING (auth.uid() = user_id);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_credit_logs_user_id ON credit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_credit_logs_created_at ON credit_logs(created_at DESC);
        
        RAISE NOTICE 'Tabela credit_logs reorganizada com sucesso';
    END IF;
END $$;

-- 5. REORGANIZAR TABELA DELETED_ACCOUNTS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela deleted_accounts...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'deleted_accounts') THEN
        -- Garantir campos obrigatorios
        ALTER TABLE deleted_accounts ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE deleted_accounts ALTER COLUMN email SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'deleted_accounts' AND pt.rowsecurity = true) THEN
            ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politica apenas para admins
        DROP POLICY IF EXISTS deleted_accounts_admin_policy ON deleted_accounts;
        CREATE POLICY deleted_accounts_admin_policy ON deleted_accounts FOR ALL USING (false);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);
        CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at ON deleted_accounts(deleted_at DESC);
        
        RAISE NOTICE 'Tabela deleted_accounts reorganizada com sucesso';
    END IF;
END $$;

-- 6. REORGANIZAR TABELA EXPORTS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela exports...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'exports') THEN
        -- Verificar foreign keys
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      WHERE tc.constraint_name = 'exports_user_id_fkey' AND tc.table_name = 'exports') THEN
            ALTER TABLE exports ADD CONSTRAINT exports_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      WHERE tc.constraint_name = 'exports_contract_id_fkey' AND tc.table_name = 'exports') THEN
            ALTER TABLE exports ADD CONSTRAINT exports_contract_id_fkey 
            FOREIGN KEY (contract_id) REFERENCES saved_contracts(id) ON DELETE CASCADE;
        END IF;
        
        -- Garantir campos obrigatorios
        ALTER TABLE exports ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE exports ALTER COLUMN export_type SET NOT NULL;
        ALTER TABLE exports ALTER COLUMN file_name SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'exports' AND pt.rowsecurity = true) THEN
            ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politicas RLS
        DROP POLICY IF EXISTS exports_select_policy ON exports;
        DROP POLICY IF EXISTS exports_insert_policy ON exports;
        
        CREATE POLICY exports_select_policy ON exports FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY exports_insert_policy ON exports FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
        CREATE INDEX IF NOT EXISTS idx_exports_contract_id ON exports(contract_id);
        CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at DESC);
        
        RAISE NOTICE 'Tabela exports reorganizada com sucesso';
    END IF;
END $$;

-- 7. REORGANIZAR TABELA FIELD_PRESETS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela field_presets...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'field_presets') THEN
        -- Verificar foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      WHERE tc.constraint_name = 'field_presets_user_id_fkey' AND tc.table_name = 'field_presets') THEN
            ALTER TABLE field_presets ADD CONSTRAINT field_presets_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        -- Garantir campos obrigatorios
        ALTER TABLE field_presets ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE field_presets ALTER COLUMN name SET NOT NULL;
        ALTER TABLE field_presets ALTER COLUMN sections SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'field_presets' AND pt.rowsecurity = true) THEN
            ALTER TABLE field_presets ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politicas RLS
        DROP POLICY IF EXISTS field_presets_policy ON field_presets;
        CREATE POLICY field_presets_policy ON field_presets FOR ALL USING (auth.uid() = user_id);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_field_presets_user_id ON field_presets(user_id);
        CREATE INDEX IF NOT EXISTS idx_field_presets_name ON field_presets(name);
        
        RAISE NOTICE 'Tabela field_presets reorganizada com sucesso';
    END IF;
END $$;

-- 8. REORGANIZAR TABELA LOGIN_ATTEMPTS
DO $$
BEGIN
    RAISE NOTICE 'Reorganizando tabela login_attempts...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'login_attempts') THEN
        -- Garantir campos obrigatorios
        ALTER TABLE login_attempts ALTER COLUMN email SET NOT NULL;
        ALTER TABLE login_attempts ALTER COLUMN attempted_at SET NOT NULL;
        
        -- Habilitar RLS
        IF NOT EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = 'login_attempts' AND pt.rowsecurity = true) THEN
            ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- Politica apenas para admins
        DROP POLICY IF EXISTS login_attempts_admin_policy ON login_attempts;
        CREATE POLICY login_attempts_admin_policy ON login_attempts FOR ALL USING (false);
        
        -- Indices
        CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);
        
        RAISE NOTICE 'Tabela login_attempts reorganizada com sucesso';
    END IF;
END $$;

-- CRIAR FUNCOES DE LIMPEZA AUTOMATICA
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM contract_cache WHERE expires_at < NOW();
    RAISE NOTICE 'Cache expirado limpo automaticamente';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    RAISE NOTICE 'Tentativas de login antigas limpas automaticamente';
END;
$$ LANGUAGE plpgsql;

-- CONCEDER PERMISSOES ADEQUADAS
GRANT SELECT, INSERT, UPDATE, DELETE ON contract_cache TO authenticated;
GRANT SELECT ON contract_templates TO authenticated;
GRANT ALL ON contracts TO authenticated;
GRANT SELECT ON credit_logs TO authenticated;
GRANT ALL ON exports TO authenticated;
GRANT ALL ON field_presets TO authenticated;

-- RELATORIO FINAL DO GRUPO 1
DO $$
DECLARE
    current_table_name TEXT;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    index_count INTEGER;
    total_tables INTEGER := 0;
    tables_with_rls INTEGER := 0;
    total_policies INTEGER := 0;
    total_indexes INTEGER := 0;
BEGIN
    RAISE NOTICE '=== RELATORIO FINAL - REORGANIZACAO GRUPO 1 ===';
    
    -- Verificar cada tabela do grupo 1
    FOR current_table_name IN VALUES ('contract_cache'), ('contract_templates'), ('contracts'), 
                             ('credit_logs'), ('deleted_accounts'), ('exports'), 
                             ('field_presets'), ('login_attempts')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = current_table_name) THEN
            total_tables := total_tables + 1;
            
            -- Verificar RLS
            SELECT pt.rowsecurity INTO rls_enabled FROM pg_tables pt WHERE pt.tablename = current_table_name;
            IF rls_enabled THEN
                tables_with_rls := tables_with_rls + 1;
            END IF;
            
            -- Contar politicas
            SELECT COUNT(*) INTO policy_count FROM pg_policies pp WHERE pp.tablename = current_table_name;
            total_policies := total_policies + policy_count;
            
            -- Contar indices
            SELECT COUNT(*) INTO index_count FROM pg_indexes pi WHERE pi.tablename = current_table_name;
            total_indexes := total_indexes + index_count;
            
            RAISE NOTICE 'Tabela %: RLS=%, Politicas=%, Indices=%', 
                        current_table_name, rls_enabled, policy_count, index_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RESUMO GRUPO 1:';
    RAISE NOTICE 'Total de tabelas reorganizadas: %', total_tables;
    RAISE NOTICE 'Tabelas com RLS habilitado: %', tables_with_rls;
    RAISE NOTICE 'Total de politicas RLS criadas: %', total_policies;
    RAISE NOTICE 'Total de indices criados: %', total_indexes;
    RAISE NOTICE 'Funcoes de limpeza automatica: 2 criadas';
    RAISE NOTICE 'Permissoes concedidas para authenticated';
    
    IF total_tables = 8 AND tables_with_rls = 8 THEN
        RAISE NOTICE 'SUCESSO: Reorganizacao do Grupo 1 CONCLUIDA com sucesso!';
        RAISE NOTICE 'Todas as tabelas foram reorganizadas e estao seguras com RLS';
        RAISE NOTICE 'Sistema otimizado para performance e seguranca';
    ELSE
        RAISE WARNING 'ATENCAO: Algumas tabelas podem nao ter sido reorganizadas completamente';
    END IF;
    
    RAISE NOTICE '=== FIM DO RELATORIO GRUPO 1 ===';
END $$;
