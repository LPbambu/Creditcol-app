import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import twilio from 'twilio'

// Define interface for the config
interface WhatsAppConfig {
    id: string
    account_sid: string
    auth_token: string
    phone_number_id: string
    messages_sent_today: number
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, to, message, contentSid, contentVariables } = body

        if (!userId || !to) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, to' },
                { status: 400 }
            )
        }

        if (!message && !contentSid) {
            return NextResponse.json(
                { error: 'Either message or contentSid is required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServerClient()

        // Fetch user's WhatsApp configuration
        const { data: rawConfig, error: configError } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('user_id', userId)
            .single()

        const config = rawConfig as any as WhatsAppConfig | null

        if (configError || !config) {
            return NextResponse.json(
                { error: 'WhatsApp configuration not found. Please configure your Twilio credentials.' },
                { status: 404 }
            )
        }

        if (!config.account_sid || !config.auth_token) {
            return NextResponse.json(
                { error: 'Twilio credentials are incomplete. Please update your WhatsApp settings.' },
                { status: 400 }
            )
        }

        // Initialize Twilio client
        const twilioClient = twilio(config.account_sid, config.auth_token)

        // Format the phone number for WhatsApp
        const fromNumber = `whatsapp:${config.phone_number_id}`
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

        // Build message options
        let messageOptions: any = {
            from: fromNumber,
            to: toNumber,
        }

        if (contentSid) {
            // Use approved template via Content SID (PRODUCTION mode)
            messageOptions.contentSid = contentSid
            if (contentVariables) {
                messageOptions.contentVariables = typeof contentVariables === 'string'
                    ? contentVariables
                    : JSON.stringify(contentVariables)
            }
            console.log(`Sending template message (Content SID: ${contentSid}) to ${toNumber}`)
        } else {
            // Fallback: send as plain text (only works within 24h window or sandbox)
            messageOptions.body = message
            console.log(`Sending plain text message to ${toNumber}`)
        }

        // Send the message
        const twilioMessage = await twilioClient.messages.create(messageOptions)

        // Update messages_sent_today counter
        await supabase
            .from('whatsapp_config')
            .update({
                messages_sent_today: (config.messages_sent_today || 0) + 1,
            } as any)
            .eq('id', config.id)

        return NextResponse.json({
            success: true,
            messageSid: twilioMessage.sid,
            status: twilioMessage.status,
        })

    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error)

        // Handle Twilio-specific errors
        if (error.code) {
            return NextResponse.json(
                { error: `Twilio Error (${error.code}): ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to send message' },
            { status: 500 }
        )
    }
}
