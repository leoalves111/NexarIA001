-- Criar tabela saved_contracts se não existir
CREATE TABLE IF NOT EXISTS saved_contracts (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  nomePersonalizado TEXT,
  tipo TEXT NOT NULL,
  tipoPersonalizado TEXT,
  tamanho TEXT NOT NULL,
  html TEXT NOT NULL,
  contratante JSONB NOT NULL,
  contratada JSONB NOT NULL,
  valor TEXT NOT NULL,
  prazo TEXT,
  leisSelecionadas JSONB,
  userId TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_saved_contracts_created_at ON saved_contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_contracts_updated_at ON saved_contracts(updated_at);
CREATE INDEX IF NOT EXISTS idx_saved_contracts_tipo ON saved_contracts(tipo);
CREATE INDEX IF NOT EXISTS idx_saved_contracts_userId ON saved_contracts(userId);

-- Habilitar RLS (Row Level Security)
ALTER TABLE saved_contracts ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios contratos
CREATE POLICY IF NOT EXISTS "Users can view own contracts" ON saved_contracts
  FOR SELECT USING (auth.uid()::text = userId OR userId IS NULL);

-- Política para permitir que usuários insiram seus próprios contratos
CREATE POLICY IF NOT EXISTS "Users can insert own contracts" ON saved_contracts
  FOR INSERT WITH CHECK (auth.uid()::text = userId OR userId IS NULL);

-- Política para permitir que usuários atualizem seus próprios contratos
CREATE POLICY IF NOT EXISTS "Users can update own contracts" ON saved_contracts
  FOR UPDATE USING (auth.uid()::text = userId OR userId IS NULL);

-- Política para permitir que usuários deletem seus próprios contratos
CREATE POLICY IF NOT EXISTS "Users can delete own contracts" ON saved_contracts
  FOR DELETE USING (auth.uid()::text = userId OR userId IS NULL);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_saved_contracts_updated_at 
  BEFORE UPDATE ON saved_contracts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
