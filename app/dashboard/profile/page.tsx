"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Lock, AlertTriangle } from "lucide-react"
import { formatCPF, formatCNPJ, formatPhone, validateCPF, validateCNPJ } from "@/utils/validation"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Dados do perfil
  const [profileData, setProfileData] = useState({
    nome: profile?.nome || "",
    sobrenome: profile?.sobrenome || "",
    cpf: profile?.cpf || "",
    razao_social: profile?.razao_social || "",
    nome_fantasia: profile?.nome_fantasia || "",
    cnpj: profile?.cnpj || "",
    nome_responsavel: profile?.nome_responsavel || "",
    whatsapp: profile?.whatsapp || "",
  })

  // Dados de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Validações
      if (profile?.tipo_pessoa === "PF" && profileData.cpf && !validateCPF(profileData.cpf)) {
        throw new Error("CPF inválido")
      }

      if (profile?.tipo_pessoa === "PJ" && profileData.cnpj && !validateCNPJ(profileData.cnpj)) {
        throw new Error("CNPJ inválido")
      }

      const { error } = await updateProfile({
        nome: profileData.nome,
        sobrenome: profileData.sobrenome,
        cpf: profileData.cpf,
        razao_social: profileData.razao_social,
        nome_fantasia: profileData.nome_fantasia,
        cnpj: profileData.cnpj,
        nome_responsavel: profileData.nome_responsavel,
        whatsapp: profileData.whatsapp,
      })

      if (error) throw new Error(error)

      setSuccess("Perfil atualizado com sucesso!")
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Erro ao atualizar",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("As senhas não coincidem")
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres")
      }

      // Aqui você implementaria a lógica para atualizar a senha
      // Como estamos usando Supabase, você precisaria usar a API deles
      // Isso é apenas uma simulação
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setSuccess("Senha atualizada com sucesso!")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso.",
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Erro ao atualizar senha",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações Pessoais
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize suas informações pessoais e de contato</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-gray-100 dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O e-mail não pode ser alterado</p>
                    </div>

                    <div>
                      <Label htmlFor="tipo-pessoa">Tipo de Pessoa</Label>
                      <Input
                        id="tipo-pessoa"
                        value={profile?.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                        disabled
                        className="bg-gray-100 dark:bg-gray-800"
                      />
                    </div>

                    {profile?.tipo_pessoa === "PF" ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                              id="nome"
                              value={profileData.nome}
                              onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="sobrenome">Sobrenome</Label>
                            <Input
                              id="sobrenome"
                              value={profileData.sobrenome}
                              onChange={(e) => setProfileData({ ...profileData, sobrenome: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            value={profileData.cpf}
                            onChange={(e) => setProfileData({ ...profileData, cpf: formatCPF(e.target.value) })}
                            maxLength={14}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="razao-social">Razão Social</Label>
                          <Input
                            id="razao-social"
                            value={profileData.razao_social}
                            onChange={(e) => setProfileData({ ...profileData, razao_social: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="nome-fantasia">Nome Fantasia</Label>
                          <Input
                            id="nome-fantasia"
                            value={profileData.nome_fantasia}
                            onChange={(e) => setProfileData({ ...profileData, nome_fantasia: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input
                            id="cnpj"
                            value={profileData.cnpj}
                            onChange={(e) => setProfileData({ ...profileData, cnpj: formatCNPJ(e.target.value) })}
                            maxLength={18}
                          />
                        </div>

                        <div>
                          <Label htmlFor="nome-responsavel">Nome do Responsável</Label>
                          <Input
                            id="nome-responsavel"
                            value={profileData.nome_responsavel}
                            onChange={(e) => setProfileData({ ...profileData, nome_responsavel: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={profileData.whatsapp}
                        onChange={(e) => setProfileData({ ...profileData, whatsapp: formatPhone(e.target.value) })}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Atualize sua senha e configurações de segurança</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Senha Atual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        A senha deve ter pelo menos 8 caracteres
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      "Atualizar Senha"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Sessões Ativas</CardTitle>
                <CardDescription>Gerencie os dispositivos conectados à sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Este dispositivo</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {navigator.userAgent.includes("Windows")
                          ? "Windows"
                          : navigator.userAgent.includes("Mac")
                            ? "MacOS"
                            : navigator.userAgent.includes("Linux")
                              ? "Linux"
                              : "Dispositivo Desconhecido"}
                        {" • "}
                        {navigator.userAgent.includes("Chrome")
                          ? "Chrome"
                          : navigator.userAgent.includes("Firefox")
                            ? "Firefox"
                            : navigator.userAgent.includes("Safari")
                              ? "Safari"
                              : "Navegador Desconhecido"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Último acesso: {new Date().toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativo</Badge>
                  </div>
                </div>

                <Button variant="outline" className="mt-4">
                  Encerrar Todas as Outras Sessões
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Exclusão de Conta</CardTitle>
                <CardDescription>Exclua permanentemente sua conta e todos os seus dados</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
                  </AlertDescription>
                </Alert>

                <Button variant="destructive" className="mt-4">
                  Excluir Minha Conta
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
