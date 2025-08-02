const twilio = require('twilio');
require('dotenv').config();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Only initialize Twilio client if credentials are provided
let client = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
    try {
        client = new twilio(accountSid, authToken);
        console.log('Twilio client initialized successfully');
    } catch (error) {
        console.warn('Failed to initialize Twilio client:', error.message);
        client = null;
    }
} else {
    console.log('Twilio credentials not provided or invalid. WhatsApp notifications will be disabled.');
}

/**
 * Sends an OTP message via WhatsApp using Twilio
 * @param {string} otp - The OTP code to send
 * @param {string} phone - The phone number to send to (without country code)
 * @returns {Promise} - Promise representing the message sending operation
 */
const sendMessage = async (msg, phone) => {
    console.log('Sending message to', phone);
    
    // Check if Twilio client is available
    if (!client) {
        console.log('Twilio not configured. Message would be sent to:', phone, 'Content:', msg);
        return { success: false, message: 'Twilio not configured' };
    }
    
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