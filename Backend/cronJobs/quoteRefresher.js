const cron = require('node-cron');
const pool = require('../db.js');
const { waitForDatabase } = require('../db.js');

// Use mysql2's built-in promise support for pools
const query = pool.promise().query.bind(pool.promise());

// Function to update quotes of the day with retry logic
async function updateQuotesOfTheDay() {
  const maxRetries = 5;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Delete all existing records from QuoteOfTheDay
      await query('DELETE FROM QuoteOfTheDay');
      
      // Get random quotes for each language in parallel
      // mysql2 promise returns [rows, fields], so we destructure to get rows
      const [[englishRows], [hindiRows], [marathiRows]] = await Promise.all([
        query("SELECT * FROM MediQuotes WHERE language = 'English' ORDER BY RAND() LIMIT 1"),
        query("SELECT * FROM MediQuotes WHERE language = 'Hindi' ORDER BY RAND() LIMIT 1"),
        query("SELECT * FROM MediQuotes WHERE language = 'Marathi' ORDER BY RAND() LIMIT 1")
      ]);
      
      // Make sure we have quotes for each language
      if (!englishRows || englishRows.length === 0 || !hindiRows || hindiRows.length === 0 || !marathiRows || marathiRows.length === 0) {
        throw new Error('Could not find quotes for all required languages');
      }
      
      // Insert new quotes in parallel
      await Promise.all([
        query('INSERT INTO QuoteOfTheDay (medi_quote_id, language) VALUES (?, ?)', 
              [englishRows[0].medi_quote_id, 'English']),
        query('INSERT INTO QuoteOfTheDay (medi_quote_id, language) VALUES (?, ?)', 
              [hindiRows[0].medi_quote_id, 'Hindi']),
        query('INSERT INTO QuoteOfTheDay (medi_quote_id, language) VALUES (?, ?)', 
              [marathiRows[0].medi_quote_id, 'Marathi'])
      ]);
      
      // Success - exit retry loop
      return;
    } catch (error) {
      lastError = error;
      if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s, 8s, 10s
          console.log(`Error updating Quote of the Day (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      // For other errors or max retries reached, throw
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

// Schedule daily update at midnight
cron.schedule('0 0 * * *', updateQuotesOfTheDay);

// Run immediately when module is required, but wait for database first
(async () => {
  try {
    await waitForDatabase();
    await updateQuotesOfTheDay();
  } catch (error) {
    console.error('Error updating Quote of the Day:', error);
  }
})();

// Export the update function in case it needs to be called manually
module.exports = { updateQuotesOfTheDay };
