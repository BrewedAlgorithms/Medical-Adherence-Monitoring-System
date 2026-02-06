const twilio = require('twilio');
require('dotenv').config();

// Twilio configuration - only initialize if valid credentials are provided
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const hasValidTwilio = accountSid && accountSid.startsWith('AC') && authToken;
const client = hasValidTwilio ? new twilio(accountSid, authToken) : null;

/**
 * Sends an OTP message via WhatsApp using Twilio
 * @param {string} msg - The message to send
 * @param {string} phone - The phone number to send to (without country code)
 * @returns {Promise} - Promise representing the message sending operation
 */
const sendMessage = async (msg, phone) => {
    if (!client) {
        console.log('Twilio not configured (missing/invalid credentials). Skipping SMS to', phone);
        return;
    }
    console.log('Sending message to', phone);
    try {
        const message = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: 'whatsapp:+91' + phone,
            body: `${msg}`
        });
        console.log('Message sent:', message.sid);
        return message;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

module.exports = {
    sendMessage
};