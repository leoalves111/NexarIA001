"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { supabase } from "@/lib/supabase"

interface Subscription {
  id: string
  plano: "gratuito" | "basico" | "premium" | "enterprise"
  status: "active" | "inactive" | "canceled"
  expires_at: string | null
  created_at: string
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    fetchSubscription()
  }, [user])

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching subscription:", error)
        // Default to free plan on error
        setSubscription({
          id: "default",
          plano: "gratuito",
          status: "active",
          expires_at: null,
          created_at: new Date().toISOString(),
        })
      } else if (data) {
        setSubscription(data)
      } else {
        // No subscription found, default to free
        setSubscription({
          id: "default",
          plano: "gratuito",
          status: "active",
          expires_at: null,
          created_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error in fetchSubscription:", error)
      // Default to free plan on error
      setSubscription({
        id: "default",
        plano: "gratuito",
        status: "active",
        expires_at: null,
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const isFreePlan = subscription?.plano === "gratuito" || !subscription
  const isPaidPlan = subscription?.plano !== "gratuito" && subscription?.status === "active"

  return {
    subscription,
    loading,
    isFreePlan,
    isPaidPlan,
    refetch: fetchSubscription,
  }
}
