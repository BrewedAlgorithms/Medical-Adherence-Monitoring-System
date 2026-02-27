const twilio = require('twilio');
require('dotenv').config();

// Twilio configuration - only initialize if credentials are provided
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const hasValidTwilio = accountSid && authToken;
const client = hasValidTwilio ? new twilio(accountSid, authToken) : null;

/**
 * Sends a WhatsApp message via Twilio
 * All messages are routed to the configured TWILIO_PHONE_NUMBER.
 * @param {string} msg - The message to send
 * @param {string} phone - The phone number (used for logging only)
 * @returns {Promise} - Promise representing the message sending operation
 */
const sendMessage = async (msg, phone) => {
    if (!client) {
        console.log('Twilio not configured (missing/invalid credentials). Skipping SMS to', phone);
        return;
    }
    const destinationNumber = process.env.DEV_TWILIO_DEF_TO || process.env.TWILIO_PHONE_NUMBER;
    console.log(`Sending WhatsApp message to ${destinationNumber} (context: ${phone})`);
    try {
        const message = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: `whatsapp:${destinationNumber}`,
            body: `${msg}`
        });
        console.log('Message sent:', message.sid);
        return message;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};

module.exports = {
    sendMessage
};