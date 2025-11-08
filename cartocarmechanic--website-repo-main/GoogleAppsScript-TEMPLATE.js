// CARTER CAR MOBILE MECHANIC - GOOGLE APPS SCRIPT BACKEND (v3 - With Calendar Integration)
// This script handles form submissions, saves to Google Sheets, creates calendar events,
// and sends notifications with robust error handling and reporting.

// ========================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ========================================
const CONFIG = {
  BUSINESS_PHONE: '3176431578',
  BUSINESS_EMAIL: 'carter.car.mechanic@gmail.com',
  TWILIO_ACCOUNT_SID: 'YOUR_TWILIO_SID_HERE',  // Get from twilio.com
  TWILIO_AUTH_TOKEN: 'YOUR_TWILIO_TOKEN_HERE',  // Get from twilio.com
  TWILIO_PHONE_NUMBER: 'YOUR_TWILIO_NUMBER_HERE',  // Format: +1XXXXXXXXXX
  SHEET_NAME: 'Carter Car CRM'
};

// NOTE: The file "GoogleAppsScript-Updated.js" in your LOCAL repository
// already has your actual credentials filled in. Use that file when
// copying to Apps Script. This template is just for GitHub.

// ========================================
// MAIN FUNCTION - Handles POST requests
// ========================================
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);

    // --- Execution Phase ---
    const errorLog = [];
    let rowId = 'N/A';
    let eventId = null;

    // 1. Save to Google Sheets
    try {
      rowId = saveToSheet(data);
      Logger.log('Step 1/5: Successfully saved to Sheet. Row ID: ' + rowId);
    } catch (err) {
      errorLog.push({ step: 'Save to Sheet', error: err.message, stack: err.stack });
      throw new Error('Failed to save to Google Sheet.'); // Critical error, stop execution
    }

    // 2. Create Google Calendar Event
    try {
      eventId = createCalendarEvent(data);
      Logger.log('Step 2/5: Calendar event created. Event ID: ' + eventId);
    } catch (err) {
      errorLog.push({ step: 'Create Calendar Event', error: err.message, stack: err.stack });
      // Non-critical - continue with other notifications
    }

    // 3. Send SMS Alert
    try {
      sendSMSAlert(data, rowId);
      Logger.log('Step 3/5: SMS alert sent successfully.');
    } catch (err) {
      errorLog.push({ step: 'Send SMS Alert', error: err.message, stack: err.stack });
    }

    // 4. Send Business Email
    try {
      sendBusinessEmailNotification(data, rowId, eventId);
      Logger.log('Step 4/5: Business email sent successfully.');
    } catch (err) {
      errorLog.push({ step: 'Send Business Email', error: err.message, stack: err.stack });
    }

    // 5. Send Customer Confirmation Email
    try {
      sendCustomerConfirmation(data);
      Logger.log('Step 5/5: Customer confirmation email sent successfully.');
    } catch (err) {
      errorLog.push({ step: 'Send Customer Email', error: err.message, stack: err.stack });
    }

    // --- Finalization Phase ---
    if (errorLog.length > 0) {
      // If there were non-critical errors, send an error report
      sendErrorReport(data, errorLog);
      Logger.log('Processing completed with non-critical errors. Report sent.');
    } else {
      Logger.log('Booking processed successfully without errors: ' + data.name);
    }

    return ContentService.createTextOutput(JSON.stringify({
      'status': errorLog.length > 0 ? 'partial_success' : 'success',
      'message': 'Booking received. ' + (errorLog.length > 0 ? errorLog.length + ' notification(s) failed.' : ''),
      'id': rowId,
      'eventId': eventId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // This catches critical errors (like parsing JSON or saving to sheet)
    Logger.log('CRITICAL Error processing booking: ' + error.toString());
    if (data) {
      // If we have the data, try to send a critical error report
      sendErrorReport(data, [{ step: 'Critical Execution', error: error.message, stack: error.stack }]);
    }
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Rest of the functions are identical to GoogleAppsScript-Updated.js
// For the complete code with your credentials, use the local file:
// GoogleAppsScript-Updated.js

// See QUICK_SETUP.md for instructions on deploying this script.
