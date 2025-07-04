-- SCRIPT PARA REMOVER TODAS AS POLITICAS RLS MANUALMENTE
-- Execute este script ANTES do script principal para evitar conflitos de dependencias

-- Remover politicas da tabela prompt_profiles (CRITICAS - causando erro)
DROP POLICY IF EXISTS "Users can only see their own profiles" ON prompt_profiles;
DROP POLICY IF EXISTS "Users can only insert their own profiles" ON prompt_profiles;
DROP POLICY IF EXISTS "Users can only update their own profiles" ON prompt_profiles;
DROP POLICY IF EXISTS "Users can only delete their own profiles" ON prompt_profiles;

-- Remover outras politicas possiveis da prompt_profiles
DROP POLICY IF EXISTS prompt_profiles_policy ON prompt_profiles;
DROP POLICY IF EXISTS prompt_profiles_select_policy ON prompt_profiles;
DROP POLICY IF EXISTS prompt_profiles_insert_policy ON prompt_profiles;
DROP POLICY IF EXISTS prompt_profiles_update_policy ON prompt_profiles;
DROP POLICY IF EXISTS prompt_profiles_delete_policy ON prompt_profiles;

-- Remover politicas da tabela saved_contracts
DROP POLICY IF EXISTS "Users can only see their own contracts" ON saved_contracts;
DROP POLICY IF EXISTS "Users can only insert their own contracts" ON saved_contracts;
DROP POLICY IF EXISTS "Users can only update their own contracts" ON saved_contracts;
DROP POLICY IF EXISTS "Users can only delete their own contracts" ON saved_contracts;
DROP POLICY IF EXISTS saved_contracts_select_policy ON saved_contracts;
DROP POLICY IF EXISTS saved_contracts_insert_policy ON saved_contracts;
DROP POLICY IF EXISTS saved_contracts_update_policy ON saved_contracts;
DROP POLICY IF EXISTS saved_contracts_delete_policy ON saved_contracts;

-- Remover politicas da tabela profiles
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON profiles;

-- Remover politicas da tabela subscriptions
DROP POLICY IF EXISTS subscriptions_policy ON subscriptions;
DROP POLICY IF EXISTS subscriptions_select_policy ON subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_policy ON subscriptions;
DROP POLICY IF EXISTS subscriptions_update_policy ON subscriptions;
DROP POLICY IF EXISTS subscriptions_delete_policy ON subscriptions;

-- Remover politicas da tabela payment_history
DROP POLICY IF EXISTS payment_history_policy ON payment_history;
DROP POLICY IF EXISTS payment_history_select_policy ON payment_history;
DROP POLICY IF EXISTS payment_history_insert_policy ON payment_history;
DROP POLICY IF EXISTS payment_history_update_policy ON payment_history;
DROP POLICY IF EXISTS payment_history_delete_policy ON payment_history;

-- Remover politicas da tabela migration_history
DROP POLICY IF EXISTS migration_history_admin_policy ON migration_history;
DROP POLICY IF EXISTS migration_history_policy ON migration_history;

-- Remover politicas da tabela login_attempts
DROP POLICY IF EXISTS login_attempts_admin_policy ON login_attempts;
DROP POLICY IF EXISTS login_attempts_policy ON login_attempts;

-- Confirmar remocao
DO $$
BEGIN
    RAISE NOTICE '✅ TODAS AS POLITICAS RLS FORAM REMOVIDAS COM SUCESSO!';
    RAISE NOTICE 'Agora execute o script principal: scripts/database-reorganization-group2-final-fixed.sql';
END $$;
