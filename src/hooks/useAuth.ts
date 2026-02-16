'use client'

import { useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { authService, type RegisterData, type LoginData } from '@/services/authService'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const loadProfile = useCallback(async (userId: string) => {
        const { data } = await authService.getProfile(userId)
        if (data) {
            setProfile(data)
        }
    }, [])

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadProfile(session.user.id)
            }
            setLoading(false)
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadProfile(session.user.id)
            } else {
                setProfile(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [loadProfile])

    const login = async (email: string, password: string) => {
        const { data, error } = await authService.login({ email, password })
        if (!error && data) {
            router.push('/dashboard')
        }
        return { data, error }
    }

    const register = async (data: RegisterData) => {
        const result = await authService.register(data)
        if (!result.error && result.data) {
            router.push('/dashboard')
        }
        return result
    }

    const logout = async () => {
        await authService.logout()
        setUser(null)
        setProfile(null)
        router.push('/login')
    }

    const refreshProfile = async () => {
        if (user) {
            await loadProfile(user.id)
        }
    }

    return {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
    }
}
