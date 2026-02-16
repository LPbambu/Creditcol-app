import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// This route tests the Twilio connection without sending a real message

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required field: userId' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Fetch user's WhatsApp configuration
        const { data: config, error: configError } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (configError || !config) {
            return NextResponse.json(
                { error: 'WhatsApp configuration not found.' },
                { status: 404 }
            )
        }

        if (!config.account_sid || !config.auth_token) {
            return NextResponse.json(
                { error: 'Twilio credentials are incomplete.' },
                { status: 400 }
            )
        }

        // Initialize Twilio client and verify account
        const twilioClient = twilio(config.account_sid, config.auth_token)

        // Fetch account details to verify credentials
        const account = await twilioClient.api.accounts(config.account_sid).fetch()

        if (account.status === 'active') {
            // Update verified status in database
            await supabase
                .from('whatsapp_config')
                .update({
                    is_verified: true,
                    verified_at: new Date().toISOString(),
                    is_active: true,
                })
                .eq('id', config.id)

            return NextResponse.json({
                success: true,
                message: 'Connection verified successfully!',
                accountName: account.friendlyName,
                accountStatus: account.status,
            })
        } else {
            return NextResponse.json(
                { error: `Account status is "${account.status}". Please check your Twilio account.` },
                { status: 400 }
            )
        }

    } catch (error: any) {
        console.error('Error testing WhatsApp connection:', error)

        if (error.code === 20003) {
            return NextResponse.json(
                { error: 'Invalid credentials. Please double-check your Account SID and Auth Token.' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to verify connection' },
            { status: 500 }
        )
    }
}
