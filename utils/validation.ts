// Validação de CPF
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false

  const cleanCPF = cpf.replace(/[^\d]/g, "")

  if (cleanCPF.length !== 11) return false

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Validar primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(9))) return false

  // Validar segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(10))) return false

  return true
}

// Validação de CNPJ
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false

  const cleanCNPJ = cnpj.replace(/[^\d]/g, "")

  if (cleanCNPJ.length !== 14) return false

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false

  // Validar primeiro dígito verificador
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(0))) return false

  // Validar segundo dígito verificador
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(1))) return false

  return true
}

// Validação de senha
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!password) {
    errors.push("Senha é obrigatória")
    return { isValid: false, errors }
  }

  if (password.length < 8) {
    errors.push("Senha deve ter pelo menos 8 caracteres")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula")
  }

  if (!/\d/.test(password)) {
    errors.push("Senha deve conter pelo menos um número")
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Senha deve conter pelo menos um caractere especial")
  }

  return { isValid: errors.length === 0, errors }
}

// Formatação de CPF
export function formatCPF(value: string): string {
  const cleanValue = value.replace(/[^\d]/g, "")

  if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  return value
}

// Formatação de CNPJ
export function formatCNPJ(value: string): string {
  const cleanValue = value.replace(/[^\d]/g, "")

  if (cleanValue.length <= 14) {
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }

  return value
}

// Formatação de telefone
export function formatPhone(value: string): string {
  const cleanValue = value.replace(/[^\d]/g, "")

  if (cleanValue.length <= 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  } else if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }

  return value
}

// Validação de email
export function validateEmail(email: string): boolean {
  if (!email) return false

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Sanitização de entrada
export function sanitizeInput(input: string): string {
  if (!input) return ""

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove caracteres HTML básicos
    .replace(/javascript:/gi, "") // Remove javascript:
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 1000) // Limita tamanho
}

// Validação de CEP
export function validateCEP(cep: string): boolean {
  if (!cep) return false

  const cleanCEP = cep.replace(/[^\d]/g, "")
  return cleanCEP.length === 8
}

// Formatação de CEP
export function formatCEP(value: string): string {
  const cleanValue = value.replace(/[^\d]/g, "")

  if (cleanValue.length <= 8) {
    return cleanValue.replace(/(\d{5})(\d{3})/, "$1-$2")
  }

  return value
}
