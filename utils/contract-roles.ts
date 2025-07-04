// ✅ SISTEMA INTELIGENTE DE AUTO-AJUSTE DE PAPÉIS CONTRATUAIS
// Resolve automaticamente quem é quem em cada tipo de contrato

interface ContractRole {
  primaryLabel: string // Ex: "LOCADOR", "EMPREGADOR"
  secondaryLabel: string // Ex: "LOCATÁRIO", "EMPREGADO"
  primaryDescription: string // Quem oferece/fornece
  secondaryDescription: string // Quem recebe/contrata
  primaryResponsibilities: string[]
  secondaryResponsibilities: string[]
  autoSwapLogic?: (contratante: ContractParty, contratada: ContractParty) => boolean
}

interface ContractParty {
  tipo?: 'pf' | 'pj'
  nome?: string
  documento?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  telefone?: string
  email?: string
}

// ✅ MAPEAMENTO INTELIGENTE DE PAPÉIS POR TIPO DE CONTRATO
const CONTRACT_ROLES: Record<string, ContractRole> = {
  locacao: {
    primaryLabel: "LOCADOR(A)",
    secondaryLabel: "LOCATÁRIO(A)",
    primaryDescription: "Proprietário do imóvel que cede o uso",
    secondaryDescription: "Pessoa que aluga o imóvel para uso",
    primaryResponsibilities: [
      "Entregar o imóvel em condições de uso",
      "Garantir o uso pacífico do imóvel",
      "Realizar reparos estruturais necessários"
    ],
    secondaryResponsibilities: [
      "Pagar o aluguel em dia",
      "Conservar o imóvel",
      "Devolver o imóvel nas mesmas condições"
    ],
    autoSwapLogic: (contratante, contratada) => 
      contratante.tipo === 'pf' && contratada.tipo === 'pj' // PJ geralmente é locador
  },
  
  trabalho: {
    primaryLabel: "EMPREGADOR(A)",
    secondaryLabel: "EMPREGADO(A)",
    primaryDescription: "Empresa ou pessoa que contrata serviços",
    secondaryDescription: "Pessoa que presta serviços subordinados",
    primaryResponsibilities: [
      "Pagar salário e benefícios",
      "Garantir condições seguras de trabalho",
      "Cumprir direitos trabalhistas"
    ],
    secondaryResponsibilities: [
      "Executar as funções contratadas",
      "Cumprir horários e procedimentos",
      "Zelar pelo patrimônio da empresa"
    ],
    autoSwapLogic: (contratante, contratada) => 
      contratante.tipo === 'pf' && contratada.tipo === 'pj' // PJ é empregador
  },
  
  servicos: {
    primaryLabel: "CONTRATANTE",
    secondaryLabel: "PRESTADOR(A) DE SERVIÇOS",
    primaryDescription: "Pessoa ou empresa que contrata serviços",
    secondaryDescription: "Pessoa ou empresa que executa os serviços",
    primaryResponsibilities: [
      "Pagar pelos serviços prestados",
      "Fornecer informações necessárias",
      "Aceitar serviços conforme especificado"
    ],
    secondaryResponsibilities: [
      "Executar serviços conforme contratado",
      "Entregar resultados no prazo",
      "Manter qualidade técnica"
    ]
  },
  
  compra_venda: {
    primaryLabel: "VENDEDOR(A)",
    secondaryLabel: "COMPRADOR(A)",
    primaryDescription: "Pessoa que vende o bem ou produto",
    secondaryDescription: "Pessoa que adquire o bem ou produto",
    primaryResponsibilities: [
      "Entregar o bem conforme especificado",
      "Garantir a propriedade do bem",
      "Cumprir prazos de entrega"
    ],
    secondaryResponsibilities: [
      "Pagar o preço acordado",
      "Receber o bem no prazo",
      "Verificar conformidade do produto"
    ]
  },
  
  consultoria: {
    primaryLabel: "CONTRATANTE",
    secondaryLabel: "CONSULTOR(A)",
    primaryDescription: "Empresa que contrata assessoria especializada",
    secondaryDescription: "Profissional que oferece conhecimento técnico",
    primaryResponsibilities: [
      "Pagar honorários de consultoria",
      "Fornecer acesso às informações",
      "Implementar recomendações acordadas"
    ],
    secondaryResponsibilities: [
      "Prestar consultoria especializada",
      "Manter sigilo das informações",
      "Entregar relatórios e análises"
    ]
  },
  
  fornecimento: {
    primaryLabel: "CONTRATANTE",
    secondaryLabel: "FORNECEDOR(A)",
    primaryDescription: "Empresa que contrata fornecimento",
    secondaryDescription: "Empresa que fornece produtos/materiais",
    primaryResponsibilities: [
      "Pagar pelos produtos fornecidos",
      "Receber produtos conforme pedido",
      "Comunicar problemas de qualidade"
    ],
    secondaryResponsibilities: [
      "Fornecer produtos de qualidade",
      "Cumprir prazos de entrega",
      "Manter estoque adequado"
    ],
    autoSwapLogic: (contratante, contratada) => 
      contratante.tipo === 'pf' && contratada.tipo === 'pj' // PJ geralmente é fornecedor
  },
  
  franquia: {
    primaryLabel: "FRANQUEADOR(A)",
    secondaryLabel: "FRANQUEADO(A)",
    primaryDescription: "Empresa detentora da marca e sistema",
    secondaryDescription: "Empresa que opera sob a franquia",
    primaryResponsibilities: [
      "Fornecer marca e sistema de negócio",
      "Dar suporte técnico e comercial",
      "Manter padrão de qualidade"
    ],
    secondaryResponsibilities: [
      "Pagar taxa de franquia",
      "Seguir padrões estabelecidos",
      "Manter exclusividade territorial"
    ]
  },
  
  licenciamento: {
    primaryLabel: "LICENCIANTE",
    secondaryLabel: "LICENCIADO(A)",
    primaryDescription: "Detentor dos direitos de propriedade",
    secondaryDescription: "Pessoa autorizada a usar os direitos",
    primaryResponsibilities: [
      "Garantir direitos de propriedade",
      "Autorizar uso conforme contrato",
      "Defender propriedade intelectual"
    ],
    secondaryResponsibilities: [
      "Pagar royalties ou taxas",
      "Usar direitos conforme autorização",
      "Respeitar limitações de uso"
    ]
  },
  
  seguro: {
    primaryLabel: "SEGURADO(A)",
    secondaryLabel: "SEGURADORA",
    primaryDescription: "Pessoa que contrata proteção",
    secondaryDescription: "Empresa que oferece proteção",
    primaryResponsibilities: [
      "Pagar prêmios em dia",
      "Informar riscos verdadeiros",
      "Comunicar sinistros"
    ],
    secondaryResponsibilities: [
      "Indenizar conforme apólice",
      "Analisar riscos adequadamente",
      "Prestar assistência contratada"
    ]
  }
}

// ✅ FUNÇÃO INTELIGENTE PARA AUTO-AJUSTAR PAPÉIS
export function adjustContractRoles(
  contractType: string,
  contratante: ContractParty,
  contratada: ContractParty
): {
  primary: ContractParty & { role: string; description: string; responsibilities: string[] }
  secondary: ContractParty & { role: string; description: string; responsibilities: string[] }
  roleMapping: ContractRole
} {
  const roleMapping = CONTRACT_ROLES[contractType] || CONTRACT_ROLES.servicos
  
  // Aplicar lógica inteligente de auto-swap se definida
  let primaryParty = contratante
  let secondaryParty = contratada
  
  if (roleMapping.autoSwapLogic && roleMapping.autoSwapLogic(contratante, contratada)) {
    primaryParty = contratada
    secondaryParty = contratante
  }
  
  return {
    primary: {
      ...primaryParty,
      role: roleMapping.primaryLabel,
      description: roleMapping.primaryDescription,
      responsibilities: roleMapping.primaryResponsibilities
    },
    secondary: {
      ...secondaryParty,
      role: roleMapping.secondaryLabel,
      description: roleMapping.secondaryDescription,
      responsibilities: roleMapping.secondaryResponsibilities
    },
    roleMapping
  }
}

// ✅ FUNÇÃO PARA GERAR IDENTIFICAÇÃO INTELIGENTE DOS PAPÉIS
export function generateRoleIdentification(
  contractType: string,
  primary: ContractParty,
  secondary: ContractParty
): string {
  const adjusted = adjustContractRoles(contractType, primary, secondary)
  
  // ✅ TERMINOLOGIA INTELIGENTE PARA PF/PJ
  const getTerminology = (party: ContractParty): string => {
    if (party.tipo === 'pf') {
      return 'residente e domiciliado(a)'
    } else {
      return 'com sede'
    }
  }
  
  return `

PAPÉIS CONTRATUAIS AUTO-AJUSTADOS PARA ${contractType.toUpperCase()}:
${adjusted.primary.role}: ${adjusted.primary.nome} (${adjusted.primary.tipo === "pf" ? "PF" : "PJ"})
- ${adjusted.primary.description}
- Termo legal: ${getTerminology(adjusted.primary)}

${adjusted.secondary.role}: ${adjusted.secondary.nome} (${adjusted.secondary.tipo === "pf" ? "PF" : "PJ"})
- ${adjusted.secondary.description}
- Termo legal: ${getTerminology(adjusted.secondary)}`
}

// ✅ FUNÇÃO PARA OBTER PAPÉIS ESPECÍFICOS POR TIPO
export function getContractRoles(contractType: string): ContractRole {
  return CONTRACT_ROLES[contractType] || CONTRACT_ROLES.servicos
}

// ✅ VALIDAÇÃO DE TIPOS CONTRATUAIS
export const VALID_CONTRACT_TYPES = Object.keys(CONTRACT_ROLES)

export default {
  adjustContractRoles,
  generateRoleIdentification,
  CONTRACT_ROLES,
  VALID_CONTRACT_TYPES,
  getContractRoles
} 