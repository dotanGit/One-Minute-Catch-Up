import { normalizeTimestamp } from '../../utils/dateUtils.js';

export function processEmailEvent(email, processedEvents) {
    if (email.timestamp) {
        processedEvents.push({
            type: 'email',
            timestamp: normalizeTimestamp(email.timestamp),
            title: email.type === 'sent' ? 'Email Sent' : 'Email Received',
            description: email.type === 'sent' ? 
                `To: ${email.to || 'No recipient'}` : 
                `From: ${email.from || 'No sender'}`,
            subject: email.subject || 'No subject',
            from: email.from,
            to: email.to,
            emailUrl: email.threadId ? 
                `https://mail.google.com/mail/u/0/#inbox/${email.threadId}` : null
        });
    }
}
