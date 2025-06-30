# 🔧 CONFIGURAÇÃO COMPLETA - NEXAR IA

## 📋 VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

Para o sistema funcionar 100%, você precisa configurar estas variáveis no arquivo `.env.local`:

\`\`\`bash
# 🟢 SUPABASE - Configurações do Banco de Dados
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🤖 OPENAI - API Key para Geração de Contratos
OPENAI_API_KEY=sk-proj-sua_chave_aqui

# 🔐 NEXTAUTH - Autenticação
NEXTAUTH_SECRET=sua_chave_secreta_aqui
NEXTAUTH_URL=http://localhost:3000
\`\`\`

## 🎯 ONDE ENCONTRAR CADA CHAVE

### 1. **SUPABASE (3 chaves necessárias)**

1. Acesse: https://supabase.com/dashboard
2. Vá em Settings → API
3. Copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRÍTICA**

### 2. **OPENAI**

1. Acesse: https://platform.openai.com/api-keys
2. Crie nova API Key
3. Copie para `OPENAI_API_KEY`

### 3. **NEXTAUTH_SECRET**

Gere uma chave aleatória:
\`\`\`bash
openssl rand -base64 32
\`\`\`

## 🗄️ CONFIGURAÇÃO DO BANCO DE DADOS

Execute este script SQL no Supabase:

\`\`\`sql
-- Execute o arquivo: scripts/nexar-system-complete-setup.sql
\`\`\`

## ✅ VERIFICAÇÃO FINAL

Para testar se tudo está funcionando:

1. **Reinicie o servidor**: `npm run dev`
2. **Acesse**: http://localhost:3000/dashboard/generator
3. **Teste geração de contrato**

## 🚨 PROBLEMAS COMUNS

### Erro: "SUPABASE_SERVICE_ROLE_KEY não configurada"
- Adicione a chave service_role no .env.local

### Erro: "API Key da OpenAI não configurada"  
- Adicione uma API Key válida da OpenAI

### Erro: "Row-level security policy"
- Execute o script SQL completo no Supabase

## 🏭 PRODUÇÃO

Para produção, configure as mesmas variáveis no seu provedor de hospedagem (Vercel, Netlify, etc.)

---

✅ **Sistema 100% funcional após configuração completa!**
