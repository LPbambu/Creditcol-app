import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for webhook (no user session available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Opt-out keywords that will block a contact
const OPT_OUT_KEYWORDS = ['stop', 'baja', 'cancelar', 'desuscribir', 'no más', 'no mas', 'eliminar', 'parar']

export async function POST(request: NextRequest) {
    try {
        // Twilio sends form-urlencoded data
        const formData = await request.formData()

        const from = formData.get('From') as string // e.g., "whatsapp:+573001234567"
        const to = formData.get('To') as string // Your Twilio number
        const body = formData.get('Body') as string
        const messageSid = formData.get('MessageSid') as string
        const profileName = formData.get('ProfileName') as string // WhatsApp display name

        if (!from || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Extract phone number (remove "whatsapp:" prefix)
        const phoneNumber = from.replace('whatsapp:', '')

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Check if this is an opt-out request
        const isOptOut = OPT_OUT_KEYWORDS.some(keyword =>
            body.toLowerCase().trim().includes(keyword)
        )

        // Find the contact by phone number
        let foundContact: { id: string; user_id: string; full_name: string | null } | null = null

        const { data: directContact, error: contactError } = await supabase
            .from('contacts')
            .select('id, user_id, full_name')
            .eq('phone', phoneNumber)
            .single()

        if (!contactError && directContact) {
            foundContact = directContact
        } else {
            // Try alternative formats
            const cleanNumber = phoneNumber.replace(/\D/g, '')
            const { data: altContact, error: altError } = await supabase
                .from('contacts')
                .select('id, user_id, full_name')
                .or(`phone.ilike.%${cleanNumber.slice(-10)}`)
                .limit(1)
                .single()

            if (!altError && altContact) {
                foundContact = altContact
            }
        }

        if (!foundContact) {
            console.log('Received message from unknown number:', phoneNumber)
            // Still acknowledge receipt to Twilio
            return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
                headers: { 'Content-Type': 'text/xml' }
            })
        }

        const contact = foundContact

        // If opt-out, block the contact
        if (isOptOut) {
            await supabase
                .from('contacts')
                .update({ is_blocked: true } as any)
                .eq('id', contact.id)

            // Log the opt-out
            await supabase.from('system_logs').insert({
                user_id: contact.user_id,
                action_type: 'contact_opted_out',
                action_category: 'contact',
                description: `${contact.full_name || phoneNumber} solicitó darse de baja`,
                status: 'warning',
                metadata: {
                    contact_id: contact.id,
                    phone: phoneNumber,
                    message: body
                }
            })

            // Return acknowledgment
            return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
                headers: { 'Content-Type': 'text/xml' }
            })
        }

        // Find the most recent outgoing message to this contact (to link the response)
        const { data: lastMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('status', 'sent')
            .order('sent_at', { ascending: false })
            .limit(1)
            .single()

        // Insert the incoming message
        const { error: insertError } = await supabase
            .from('messages')
            .insert({
                user_id: contact.user_id,
                contact_id: contact.id,
                phone: phoneNumber,
                content: body,
                status: 'received',
                provider: 'twilio',
                provider_message_id: messageSid,
                sent_at: new Date().toISOString(),
            })

        if (insertError) {
            console.error('Error inserting incoming message:', insertError)
        }

        // Update the last outgoing message to mark it as having a response
        if (lastMessage) {
            await supabase
                .from('messages')
                .update({
                    has_response: true,
                    response_content: body,
                    response_at: new Date().toISOString(),
                } as any)
                .eq('id', lastMessage.id)
        }

        // Log the incoming message
        await supabase.from('system_logs').insert({
            user_id: contact.user_id,
            action_type: 'message_received',
            action_category: 'message',
            description: `Mensaje recibido de ${contact.full_name || phoneNumber}`,
            status: 'success',
            metadata: {
                contact_id: contact.id,
                phone: phoneNumber,
                profile_name: profileName,
                message_preview: body.substring(0, 100)
            }
        })

        // Return empty TwiML response (acknowledge receipt)
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
            headers: { 'Content-Type': 'text/xml' }
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Twilio also sends GET requests for verification
export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint active' })
}
