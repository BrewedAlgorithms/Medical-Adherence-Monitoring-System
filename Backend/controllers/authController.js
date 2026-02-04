const connection = require('../db.js');
const crypto = require('crypto');
// DISABLED: Twilio OTP sending for development - using hardcoded "0000" OTP
// const { sendMessage } = require('../twilio.js');

const initializeLogin = async (req, res) => {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    if (phone.length !== 10) {
        return res.status(400).json({ message: 'Invalid phone number' });
    }
    
    // Generate OTP (4-digit code)
    // DISABLED: Using hardcoded OTP for development/testing
    // const otp = Math.floor(1000 + Math.random() * 9000);
    const otp = "0000"; // Hardcoded OTP - Twilio disabled for development
    
    try {
        // Check if user exists
        connection.query('SELECT * FROM Users WHERE phone = ?', [phone], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Error initializing login' });
            }
            
            if (results.length === 0) {
                // Create a new user
                connection.query(
                    'INSERT INTO Users (phone, otp) VALUES (?, ?)',
                    [phone, otp],
                    async (err) => {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({ message: 'Error saving user' });
                        }
                        
                        // DISABLED: Twilio OTP sending for development
                        // try {
                        //     // Send OTP message
                        //     await sendMessage("Your OTP is: " + otp, phone);
                        //     return res.status(201).json({ message: 'User created and OTP sent' });
                        // } catch (error) {
                        //     console.error('Failed to send OTP:', error);
                        //     return res.status(500).json({ message: 'Failed to send OTP' });
                        // }
                        console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
                        return res.status(201).json({ message: 'User created and OTP sent' });
                    }
                );
            } else {
                // Update existing user's OTP
                connection.query('UPDATE Users SET otp = ? WHERE phone = ?', [otp, phone], async (err) => {
                    if (err) {
                        console.error('Error updating OTP:', err);
                        return res.status(500).json({ message: 'Error updating user' });
                    }
                    
                    // DISABLED: Twilio OTP sending for development
                    // Only send OTP if profile is complete
                    if (results[0].isprofilecomplete) {
                        // try {
                        //     await sendMessage(otp, phone);
                        //     return res.json({ message: 'OTP sent' });
                        // } catch (error) {
                        //     console.error('Failed to send OTP:', error);
                        //     return res.status(500).json({ message: 'Failed to send OTP' });
                        // }
                        console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
                        return res.json({ message: 'OTP sent' });
                    } else {
                        return res.status(201).json({ message: 'User created' });
                    }
                });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const login = (req, res) => {
    const { phone, otp } = req.body;
    
    // Validate request
    if (!phone || !otp) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // DISABLED: OTP verification for development - accept any OTP
    // Verify OTP
    connection.query('SELECT * FROM Users WHERE phone = ?', [phone], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error logging in' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid phone or OTP' });
        }
        
        // DEV MODE: Log that any OTP was accepted
        console.log(`[DEV MODE] Login accepted for ${phone} with any OTP: ${otp}`);

        // Generate auth token and save
        const authToken = crypto.randomBytes(9).toString('hex');
        const userId = results[0].user_id;

        connection.query('INSERT INTO AuthTokens (user_id, auth_token) VALUES (?, ?)', [userId, authToken], (err) => {
            if (err) {
                console.error('Error saving auth token:', err);
                return res.status(500).json({ message: 'Error saving auth token' });
            }

            // Clear OTP after successful authentication
            connection.query('UPDATE Users SET otp = NULL WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    console.error('Error clearing OTP:', err);
                    return res.status(500).json({ message: 'Error updating user' });
                }
                
                // Return user ID and auth token
                return res.json({ userId, authToken });
            });
        });
    });
};

const register = (req, res) => {
    const { user_id, email, name, address, language } = req.body;
    
    // Validate request
    if (!user_id || !email || !name || !address || !language) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create medication times record
    connection.query('INSERT INTO MedicationTimes (user_id) VALUES (?)', [user_id], (err) => {
        if (err) {
            console.error('Error creating medication times:', err);
            return res.status(500).json({ message: 'Error creating medication times' });
        }
    });
    
    // Update user profile
    connection.query('SELECT * FROM Users WHERE user_id = ?', [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error registering user' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        connection.query(
            'UPDATE Users SET email = ?, name = ?, address = ?, language = ?, isprofilecomplete = true WHERE user_id = ?',
            [email, name, address, language, user_id],
            (err) => {
                if (err) {
                    console.error('Error updating profile:', err);
                    return res.status(500).json({ message: 'Error updating user' });
                }
                return res.json({ message: 'User profile completed' });
            }
        );
    });
};

const logout = (req, res) => {
    const authToken = req.headers['authorization']?.split(' ')[1];
    
    if (!authToken) {
        return res.status(400).json({ message: 'No auth token provided' });
    }
    
    // Remove auth token
    connection.query('DELETE FROM AuthTokens WHERE auth_token = ?', [authToken], (err, result) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ message: 'Error during logout' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Token not found' });
        }
        
        return res.json({ message: 'Logged out successfully' });
    });
};

// For Testing - Validate auth token
const validate = (req, res) => {
    const authToken = req.headers['authorization']?.split(' ')[1];
    
    if (!authToken) {
        return res.status(400).json({ message: 'No auth token provided' });
    }
    
    connection.query('SELECT * FROM AuthTokens WHERE auth_token = ?', [authToken], (err, results) => {
        if (err) {
            console.error('Error validating token:', err);
            return res.status(500).json({ message: 'Error validating auth token' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid auth token' });
        }
        
        connection.query('SELECT * FROM Users WHERE user_id = ?', [results[0].user_id], (err, results) => {
            if (err) {
                console.error('Error retrieving user:', err);
                return res.status(500).json({ message: 'Error getting user' });
            }
            
            return res.json(results[0]);
        });
    });
};

module.exports = {
    login,
    register,
    logout,
    validate,
    initializeLogin
};