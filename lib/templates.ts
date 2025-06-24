export interface ContractTemplate {
  value: string
  label: string
  description: string
  category: string
}

export const templates: ContractTemplate[] = [
  {
    value: "classic",
    label: "Clássico",
    description: "Template tradicional com formatação padrão",
    category: "standard",
  },
  {
    value: "modern",
    label: "Moderno",
    description: "Design limpo e contemporâneo",
    category: "standard",
  },
  {
    value: "corporate",
    label: "Corporativo",
    description: "Formato empresarial profissional",
    category: "business",
  },
  {
    value: "legal",
    label: "Jurídico",
    description: "Formatação específica para escritórios de advocacia",
    category: "legal",
  },
  {
    value: "minimal",
    label: "Minimalista",
    description: "Design simples e direto",
    category: "standard",
  },
]

export const getTemplateByValue = (value: string) => {
  return templates.find((template) => template.value === value) || templates[0]
}

export const getTemplatesByCategory = (category: string) => {
  return templates.filter((template) => template.category === category)
}
