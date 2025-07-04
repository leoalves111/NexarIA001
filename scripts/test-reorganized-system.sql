-- =====================================================
-- SCRIPT DE TESTE DO SISTEMA REORGANIZADO
-- Testa todas as funcionalidades após reorganização
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_contract_id UUID;
    test_profile_id UUID;
    test_subscription_id UUID;
    test_prompt_id UUID;
    contract_count INTEGER;
    profile_count INTEGER;
    subscription_count INTEGER;
    prompt_count INTEGER;
    test_results TEXT := '';
BEGIN
    RAISE NOTICE '🧪 INICIANDO TESTES DO SISTEMA REORGANIZADO...';
    RAISE NOTICE '================================================';
    
    -- Gerar IDs de teste
    test_user_id := gen_random_uuid();
    test_contract_id := gen_random_uuid();
    test_profile_id := test_user_id;
    test_subscription_id := gen_random_uuid();
    test_prompt_id := gen_random_uuid();
    
    -- =====================================================
    -- TESTE 1: INSERIR PERFIL DE USUÁRIO
    -- =====================================================
    BEGIN
        INSERT INTO profiles (
            id, tipo_pessoa, nome, sobrenome, email, 
            created_at, updated_at
        ) VALUES (
            test_profile_id, 'PF', 'João', 'Silva', 'joao@teste.com',
            NOW(), NOW()
        );
        
        test_results := test_results || '✅ TESTE 1: Perfil inserido com sucesso' || E'\n';
        RAISE NOTICE '✅ TESTE 1: Perfil inserido com sucesso';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 1: Erro ao inserir perfil - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 1: Erro ao inserir perfil - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 2: INSERIR ASSINATURA
    -- =====================================================
    BEGIN
        INSERT INTO subscriptions (
            id, user_id, plano, status, creditos_avancados, creditos_premium,
            created_at, updated_at
        ) VALUES (
            test_subscription_id, test_user_id, 'premium', 'active', 10, 5,
            NOW(), NOW()
        );
        
        test_results := test_results || '✅ TESTE 2: Assinatura inserida com sucesso' || E'\n';
        RAISE NOTICE '✅ TESTE 2: Assinatura inserida com sucesso';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 2: Erro ao inserir assinatura - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 2: Erro ao inserir assinatura - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 3: INSERIR CONTRATO SALVO (SEM DUPLICAÇÕES)
    -- =====================================================
    BEGIN
        INSERT INTO saved_contracts (
            id, titulo, nomepersonalizado, tipo, tipopersonalizado, tamanho,
            html, contratante, contratada, valor, prazo,
            datageracao, datamodificacao, leisselecionadas, user_id,
            created_at, updated_at
        ) VALUES (
            test_contract_id, 
            'Contrato de Teste', 
            'Meu Contrato Personalizado',
            'servicos', 
            'Consultoria Especializada',
            'normal',
            '<html><body>Contrato de teste</body></html>',
            '{"nome": "João Silva", "documento": "123.456.789-00"}',
            '{"nome": "Empresa XYZ", "documento": "12.345.678/0001-90"}',
            'R$ 5.000,00',
            '30 dias',
            NOW(),
            NOW(),
            ARRAY['Lei 8.078/90', 'Lei 10.406/02'],
            test_user_id,
            NOW(),
            NOW()
        );
        
        test_results := test_results || '✅ TESTE 3: Contrato salvo inserido com sucesso (sem duplicações)' || E'\n';
        RAISE NOTICE '✅ TESTE 3: Contrato salvo inserido com sucesso (sem duplicações)';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 3: Erro ao inserir contrato - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 3: Erro ao inserir contrato - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 4: INSERIR PERFIL DE PROMPT
    -- =====================================================
    BEGIN
        INSERT INTO prompt_profiles (
            id, nome, prompt, tipo, tipopersonalizado, observacoes,
            tags, usage_count, user_id, created_at, updated_at
        ) VALUES (
            test_prompt_id,
            'Perfil de Teste',
            'Este é um prompt de teste para contratos de serviços',
            'servicos',
            'Consultoria Especializada',
            'Observações de teste',
            ARRAY['teste', 'consultoria', 'servicos'],
            0,
            test_user_id,
            NOW(),
            NOW()
        );
        
        test_results := test_results || '✅ TESTE 4: Perfil de prompt inserido com sucesso' || E'\n';
        RAISE NOTICE '✅ TESTE 4: Perfil de prompt inserido com sucesso';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 4: Erro ao inserir perfil de prompt - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 4: Erro ao inserir perfil de prompt - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 5: VERIFICAR ESTRUTURA DAS TABELAS
    -- =====================================================
    BEGIN
        -- Verificar se colunas duplicadas foram removidas
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'saved_contracts' 
            AND column_name IN ('nomePersonalizado', 'tipoPersonalizado', 'leisSelecionadas')
        ) THEN
            test_results := test_results || '❌ TESTE 5: Ainda existem colunas duplicadas!' || E'\n';
            RAISE NOTICE '❌ TESTE 5: Ainda existem colunas duplicadas!';
        ELSE
            test_results := test_results || '✅ TESTE 5: Colunas duplicadas removidas com sucesso' || E'\n';
            RAISE NOTICE '✅ TESTE 5: Colunas duplicadas removidas com sucesso';
        END IF;
        
        -- Verificar se userid foi migrado para user_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name IN ('saved_contracts', 'prompt_profiles') 
            AND column_name = 'userid'
        ) THEN
            test_results := test_results || '❌ TESTE 5: Coluna userid ainda existe!' || E'\n';
            RAISE NOTICE '❌ TESTE 5: Coluna userid ainda existe!';
        ELSE
            test_results := test_results || '✅ TESTE 5: Migração userid → user_id concluída' || E'\n';
            RAISE NOTICE '✅ TESTE 5: Migração userid → user_id concluída';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 5: Erro ao verificar estrutura - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 5: Erro ao verificar estrutura - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 6: VERIFICAR FOREIGN KEYS
    -- =====================================================
    BEGIN
        -- Verificar se foreign keys estão funcionando
        SELECT COUNT(*) INTO contract_count 
        FROM saved_contracts sc
        JOIN profiles p ON sc.user_id = p.id
        WHERE sc.user_id = test_user_id;
        
        SELECT COUNT(*) INTO subscription_count
        FROM subscriptions s
        JOIN profiles p ON s.user_id = p.id
        WHERE s.user_id = test_user_id;
        
        SELECT COUNT(*) INTO prompt_count
        FROM prompt_profiles pp
        JOIN profiles p ON pp.user_id = p.id
        WHERE pp.user_id = test_user_id;
        
        IF contract_count > 0 AND subscription_count > 0 AND prompt_count > 0 THEN
            test_results := test_results || '✅ TESTE 6: Foreign keys funcionando corretamente' || E'\n';
            RAISE NOTICE '✅ TESTE 6: Foreign keys funcionando corretamente';
        ELSE
            test_results := test_results || '❌ TESTE 6: Problemas com foreign keys' || E'\n';
            RAISE NOTICE '❌ TESTE 6: Problemas com foreign keys';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 6: Erro ao verificar foreign keys - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 6: Erro ao verificar foreign keys - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 7: TESTAR FUNÇÕES DO SISTEMA
    -- =====================================================
    BEGIN
        -- Testar função get_user_subscription
        PERFORM get_user_subscription(test_user_id::text);
        
        -- Testar função get_user_contracts_count
        PERFORM get_user_contracts_count(test_user_id::text);
        
        test_results := test_results || '✅ TESTE 7: Funções do sistema funcionando' || E'\n';
        RAISE NOTICE '✅ TESTE 7: Funções do sistema funcionando';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 7: Erro nas funções do sistema - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 7: Erro nas funções do sistema - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 8: VERIFICAR POLÍTICAS RLS
    -- =====================================================
    BEGIN
        -- Verificar se políticas RLS foram criadas
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('profiles', 'saved_contracts', 'subscriptions', 'prompt_profiles')
        ) THEN
            test_results := test_results || '✅ TESTE 8: Políticas RLS criadas com sucesso' || E'\n';
            RAISE NOTICE '✅ TESTE 8: Políticas RLS criadas com sucesso';
        ELSE
            test_results := test_results || '❌ TESTE 8: Políticas RLS não encontradas' || E'\n';
            RAISE NOTICE '❌ TESTE 8: Políticas RLS não encontradas';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '❌ TESTE 8: Erro ao verificar políticas RLS - ' || SQLERRM || E'\n';
        RAISE NOTICE '❌ TESTE 8: Erro ao verificar políticas RLS - %', SQLERRM;
    END;
    
    -- =====================================================
    -- LIMPEZA DOS DADOS DE TESTE
    -- =====================================================
    BEGIN
        DELETE FROM saved_contracts WHERE id = test_contract_id;
        DELETE FROM prompt_profiles WHERE id = test_prompt_id;
        DELETE FROM subscriptions WHERE id = test_subscription_id;
        DELETE FROM profiles WHERE id = test_profile_id;
        
        test_results := test_results || '✅ LIMPEZA: Dados de teste removidos' || E'\n';
        RAISE NOTICE '✅ LIMPEZA: Dados de teste removidos';
    EXCEPTION WHEN OTHERS THEN
        test_results := test_results || '⚠️ LIMPEZA: Erro ao remover dados de teste - ' || SQLERRM || E'\n';
        RAISE NOTICE '⚠️ LIMPEZA: Erro ao remover dados de teste - %', SQLERRM;
    END;
    
    -- =====================================================
    -- RELATÓRIO FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 RELATÓRIO FINAL DOS TESTES';
    RAISE NOTICE '================================================';
    RAISE NOTICE '%', test_results;
    RAISE NOTICE '================================================';
    RAISE NOTICE '🎉 TESTES CONCLUÍDOS!';
    RAISE NOTICE '';
    
    -- Verificar se todos os testes passaram
    IF test_results !~ '❌' THEN
        RAISE NOTICE '🎯 RESULTADO: TODOS OS TESTES PASSARAM! ✅';
        RAISE NOTICE '🚀 SISTEMA COMPLETAMENTE REORGANIZADO E FUNCIONAL!';
    ELSE
        RAISE NOTICE '⚠️ RESULTADO: ALGUNS TESTES FALHARAM';
        RAISE NOTICE '🔧 VERIFIQUE OS ERROS ACIMA PARA CORREÇÕES';
    END IF;
    
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL DA ESTRUTURA
-- =====================================================
SELECT 
    'TABELAS REORGANIZADAS' as categoria,
    COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'saved_contracts', 'subscriptions', 
    'payment_history', 'prompt_profiles', 
    'migration_history', 'login_attempts'
);

-- Verificar colunas das tabelas principais
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('saved_contracts', 'prompt_profiles')
AND column_name IN ('user_id', 'nomepersonalizado', 'tipopersonalizado', 'leisselecionadas')
ORDER BY table_name, column_name;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'saved_contracts', 'subscriptions', 'prompt_profiles')
ORDER BY tablename, policyname;
