import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint checks for scheduled campaigns and sends them
// Should be called periodically (e.g., every minute) while the app is running

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find scheduled campaigns that are due
        const now = new Date().toISOString()
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*, message_templates(*)')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now)
            .limit(5)

        if (error) throw error
        if (!campaigns || campaigns.length === 0) {
            return NextResponse.json({ message: 'No scheduled campaigns to process', processed: 0 })
        }

        const results: { campaign_id: string; name: string; sent: number; failed: number }[] = []

        for (const campaign of campaigns) {
            // Mark as sending
            await supabase
                .from('campaigns')
                .update({ status: 'sending' })
                .eq('id', campaign.id)

            // Get contacts to send to
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, full_name, phone, email, city')
                .eq('is_active', true)
                .eq('is_blocked', false)

            if (!contacts || contacts.length === 0) {
                await supabase
                    .from('campaigns')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        messages_sent: 0,
                        messages_failed: 0,
                        messages_pending: 0
                    })
                    .eq('id', campaign.id)
                continue
            }

            const template = campaign.message_templates
            if (!template) {
                await supabase
                    .from('campaigns')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', campaign.id)
                continue
            }

            let sent = 0, failed = 0

            for (const contact of contacts) {
                // Personalize the message
                let messageContent = template.content
                messageContent = messageContent.replace(/\{\{nombre\}\}/gi, contact.full_name || '')
                messageContent = messageContent.replace(/\{\{telefono\}\}/gi, contact.phone || '')
                messageContent = messageContent.replace(/\{\{email\}\}/gi, contact.email || '')
                messageContent = messageContent.replace(/\{\{ciudad\}\}/gi, contact.city || '')

                try {
                    // Call the send API internally
                    const baseUrl = request.nextUrl.origin
                    const response = await fetch(`${baseUrl}/api/whatsapp/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: campaign.user_id,
                            to: contact.phone,
                            message: messageContent,
                        }),
                    })

                    if (response.ok) {
                        sent++
                    } else {
                        failed++
                    }
                } catch {
                    failed++
                }

                // Delay between messages
                await new Promise(r => setTimeout(r, 500))
            }

            // Update campaign with results
            await supabase
                .from('campaigns')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    messages_sent: sent,
                    messages_failed: failed,
                    messages_pending: 0,
                    total_contacts: contacts.length
                })
                .eq('id', campaign.id)

            // Log the campaign execution
            await supabase.from('system_logs').insert({
                user_id: campaign.user_id,
                action_type: 'scheduled_campaign_executed',
                action_category: 'campaign',
                description: `Campaña programada "${campaign.name}" ejecutada: ${sent} enviados, ${failed} fallidos`,
                status: failed === 0 ? 'success' : 'warning',
                metadata: {
                    campaign_id: campaign.id,
                    sent,
                    failed,
                    total: contacts.length
                }
            })

            results.push({
                campaign_id: campaign.id,
                name: campaign.name,
                sent,
                failed
            })
        }

        return NextResponse.json({
            message: `Processed ${results.length} scheduled campaigns`,
            processed: results.length,
            results
        })

    } catch (error) {
        console.error('Scheduler error:', error)
        return NextResponse.json({ error: 'Scheduler error' }, { status: 500 })
    }
}
