import { supabase } from '@/lib/supabase/client'
import { logService } from './logService'

export interface RegisterData {
    email: string
    password: string
    fullName: string
    phone?: string
    companyName?: string
}

export interface LoginData {
    email: string
    password: string
}

export const authService = {
    async register(data: RegisterData) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        phone: data.phone,
                        company_name: data.companyName,
                    },
                },
            })

            if (authError) throw authError

            if (authData.user) {
                // Non-blocking log
                logService.log({
                    userId: authData.user.id,
                    actionType: 'register',
                    actionCategory: 'auth',
                    description: `Usuario registrado: ${data.email}`,
                    status: 'success',
                })
            }

            return { data: authData, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },

    async login(data: LoginData) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (authError) throw authError

            if (authData.user) {
                // Non-blocking log
                logService.log({
                    userId: authData.user.id,
                    actionType: 'login',
                    actionCategory: 'auth',
                    description: `Usuario inició sesión: ${data.email}`,
                    status: 'success',
                })
            }

            return { data: authData, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },

    async logout() {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase.auth.signOut()

            if (error) throw error

            if (user) {
                // Non-blocking log
                logService.log({
                    userId: user.id,
                    actionType: 'logout',
                    actionCategory: 'auth',
                    description: 'Usuario cerró sesión',
                    status: 'success',
                })
            }

            return { error: null }
        } catch (error: any) {
            return { error: error.message }
        }
    },

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error) throw error

            return { data: user, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },

    async getProfile(userId: string) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },

    async updateProfile(userId: string, updates: {
        full_name?: string
        phone?: string
        company_name?: string
        avatar_url?: string
    }) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },
}
