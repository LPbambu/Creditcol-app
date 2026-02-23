// WhatsApp Service
// Client-side functions to interact with the WhatsApp API routes

interface SendMessageParams {
    userId: string
    to: string
    message: string
}

interface SendMessageResult {
    success: boolean
    messageSid?: string
    status?: string
    error?: string
}

interface TestConnectionResult {
    success: boolean
    message?: string
    accountName?: string
    accountStatus?: string
    error?: string
}

/**
 * Send a WhatsApp message to a single recipient
 */
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
        const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to send message',
            }
        }

        return {
            success: true,
            messageSid: data.messageSid,
            status: data.status,
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error',
        }
    }
}

/**
 * Test the Twilio connection with stored credentials
 */
export async function testWhatsAppConnection(userId: string): Promise<TestConnectionResult> {
    try {
        const response = await fetch('/api/whatsapp/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to verify connection',
            }
        }

        return {
            success: true,
            message: data.message,
            accountName: data.accountName,
            accountStatus: data.accountStatus,
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error',
        }
    }
}

const formatName = (fullName?: string | null): string => {
    if (!fullName) return '';
    const parts = fullName.trim().toLowerCase().split(/\s+/);
    if (parts.length === 0) return '';

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

    if (parts.length === 1) return capitalize(parts[0]);
    if (parts.length === 2) return `${capitalize(parts[0])} ${capitalize(parts[1])}`;
    if (parts.length === 3) return `${capitalize(parts[0])} ${capitalize(parts[1])}`; // Name1 Surname1

    // Typical structure: Name1 Name2 Surname1 Surname2 -> parts[0] + parts[2]
    return `${capitalize(parts[0])} ${capitalize(parts[2])}`;
}

/**
 * Personalize a message template with contact data
 */
export function personalizeMessage(template: string, contact: { full_name?: string; phone?: string;[key: string]: any }): string {
    let message = template

    // Replace common variables
    if (contact.full_name) {
        const formattedName = formatName(contact.full_name);
        message = message.replace(/\{\{nombre\}\}/gi, formattedName)
        message = message.replace(/\{\{name\}\}/gi, formattedName)
        message = message.replace(/\{\{full_name\}\}/gi, formattedName)
        message = message.replace(/\{\{1\}\}/gi, formattedName)
    }

    if (contact.phone) {
        message = message.replace(/\{\{telefono\}\}/gi, contact.phone)
        message = message.replace(/\{\{phone\}\}/gi, contact.phone)
    }

    // Replace any remaining custom fields
    Object.keys(contact).forEach(key => {
        if (key === 'full_name' || key === 'phone') return; // Skip standard keys
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
        message = message.replace(regex, String(contact[key] || ''))
    })

    return message
}

/**
 * Send messages to multiple contacts (for campaigns)
 */
export async function sendBulkMessages(
    userId: string,
    contacts: Array<{ phone: string; message: string }>,
    delayMs: number = 1000
): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const contact of contacts) {
        const result = await sendWhatsAppMessage({
            userId,
            to: contact.phone,
            message: contact.message,
        })

        if (result.success) {
            sent++
        } else {
            failed++
            errors.push(`${contact.phone}: ${result.error}`)
        }

        // Add delay between messages to avoid rate limiting
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    return { sent, failed, errors }
}
