// CARTER CAR MOBILE MECHANIC - GOOGLE APPS SCRIPT BACKEND (v3 - With Calendar Integration)
// This script handles form submissions, saves to Google Sheets, creates calendar events,
// and sends notifications with robust error handling and reporting.

// ========================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ========================================
const CONFIG = {
  BUSINESS_PHONE: '3176431578',
  BUSINESS_EMAIL: 'carter.car.mechanic@gmail.com',
  TWILIO_ACCOUNT_SID: 'YOUR_TWILIO_ACCOUNT_SID', // Get from twilio.com - replace with your actual SID
  TWILIO_AUTH_TOKEN: 'YOUR_TWILIO_AUTH_TOKEN', // Get from twilio.com - replace with your actual token
  TWILIO_PHONE_NUMBER: '+1XXXXXXXXXX', // Your Twilio number - replace with your actual number
  SHEET_NAME: 'Carter Car CRM' // Name of the sheet tab
};

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

// ========================================
// SAVE TO GOOGLE SHEETS
// ========================================
function saveToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Row ID', 'Lead Score', 'Status', 'Customer Name', 'Phone', 'Email',
      'Vehicle', 'Service Type', 'Location', 'Details', 'Preferred Date', 'Preferred Time',
      'Emergency?', 'Fleet?', 'Follow-up Date', 'Notes', 'Calendar Event ID'
    ]);
    const headerRange = sheet.getRange(1, 1, 1, 18);
    headerRange.setBackground('#ff6b00').setFontColor('#ffffff').setFontWeight('bold');
  }

  const rowId = 'BK' + Date.now();
  const rowData = [
    data.timestamp, rowId, data.leadScore, data.isEmergency ? 'URGENT' : 'New',
    data.name, data.phone, data.email, data.vehicle, data.service, data.location,
    data.details, data.preferredDate, data.preferredTime, data.isEmergency ? 'YES' : 'No',
    data.isFleet ? 'YES' : 'No', '', '', '' // Calendar Event ID will be updated later if needed
  ];

  sheet.appendRow(rowData);
  const lastRow = sheet.getLastRow();
  const rowRange = sheet.getRange(lastRow, 1, 1, 18);

  if (data.isEmergency) {
    rowRange.setBackground('#ffcccc');
  } else if (data.leadScore >= 80) {
    rowRange.setBackground('#ffffcc');
  } else if (data.isFleet) {
    rowRange.setBackground('#ccffcc');
  }

  return rowId;
}

// ========================================
// CREATE GOOGLE CALENDAR EVENT
// ========================================
function createCalendarEvent(data) {
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.BUSINESS_EMAIL);

    if (!calendar) {
      throw new Error('Calendar not found: ' + CONFIG.BUSINESS_EMAIL);
    }

    // Parse the preferred date and time
    let eventDate;
    try {
      eventDate = new Date(data.preferredDate);
    } catch (e) {
      // Fallback parsing
      eventDate = new Date();
      Logger.log('Warning: Could not parse preferredDate, using current date');
    }

    // Parse time from format like "9:00 AM" or "2:00 PM"
    const timeParts = data.preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);

    if (timeParts) {
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      eventDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 9 AM if time parsing fails
      eventDate.setHours(9, 0, 0, 0);
      Logger.log('Warning: Could not parse preferredTime, defaulting to 9:00 AM');
    }

    // Create 2-hour appointment slot
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2);

    const title = `${data.service} - ${data.name} - ${data.vehicle}`;
    const description = `
🔧 CARTER CAR APPOINTMENT

Customer: ${data.name}
Phone: ${data.phone}
Email: ${data.email}

Vehicle: ${data.vehicle}
Service: ${data.service}
Location: ${data.location}

Details: ${data.details || 'No additional details'}

Emergency: ${data.isEmergency ? '🚨 YES' : 'No'}
Fleet Service: ${data.isFleet ? 'YES' : 'No'}
Lead Score: ${data.leadScore}/100

$45 Service Fee - Credited to repair cost
    `.trim();

    const event = calendar.createEvent(title, eventDate, endDate, {
      description: description,
      location: data.location || 'Customer Location (see details)',
      sendInvites: false
    });

    // Set event color based on priority
    if (data.isEmergency) {
      event.setColor(CalendarApp.EventColor.RED);
    } else if (data.leadScore >= 80) {
      event.setColor(CalendarApp.EventColor.ORANGE);
    } else if (data.isFleet) {
      event.setColor(CalendarApp.EventColor.GREEN);
    }

    Logger.log('Calendar event created: ' + event.getId());
    return event.getId();

  } catch (err) {
    Logger.log('Error creating calendar event: ' + err.toString());
    throw new Error('Failed to create calendar event: ' + err.message);
  }
}

// ========================================
// SEND SMS ALERT
// ========================================
function sendSMSAlert(data, rowId) {
  if (!CONFIG.TWILIO_ACCOUNT_SID || !CONFIG.TWILIO_AUTH_TOKEN || !CONFIG.TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio configuration is missing.');
  }
  const urgencyFlag = data.isEmergency ? '🚨 EMERGENCY 🚨' : '📋 New Booking';
  const fleetFlag = data.isFleet ? ' [FLEET]' : '';
  const message = `${urgencyFlag}${fleetFlag}\n\nCarter Car - New Appointment Request\nID: ${rowId}\nScore: ${data.leadScore}/100\n\nCustomer: ${data.name}\nPhone: ${data.phone}\nVehicle: ${data.vehicle}\nService: ${data.service}\nWhen: ${data.preferredDate} ${data.preferredTime}\n\n${data.isEmergency ? '⚡ RESPOND IMMEDIATELY!' : 'Call within 1 hour'}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.TWILIO_ACCOUNT_SID}/Messages.json`;
  const payload = {
    'To': '+1' + CONFIG.BUSINESS_PHONE,
    'From': CONFIG.TWILIO_PHONE_NUMBER,
    'Body': message
  };
  const options = {
    'method': 'post',
    'payload': payload,
    'headers': {
      'Authorization': 'Basic ' + Utilities.base64Encode(CONFIG.TWILIO_ACCOUNT_SID + ':' + CONFIG.TWILIO_AUTH_TOKEN)
    },
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode >= 300) {
    throw new Error(`Twilio API Error: ${responseCode} - ${responseBody}`);
  }
}

// ========================================
// SEND EMAIL TO BUSINESS
// ========================================
function sendBusinessEmailNotification(data, rowId, eventId) {
  const urgencyLabel = data.isEmergency ? '🚨 EMERGENCY REQUEST' : '📋 New Booking Request';
  const priorityColor = data.isEmergency ? '#ff0000' : '#ff6b00';
  const subject = `${urgencyLabel} - ${data.name} - ${data.vehicle}`;
  const calendarLink = eventId ? `https://calendar.google.com/calendar/event?eid=${Utilities.base64Encode(eventId)}` : '';

  MailApp.sendEmail({
    to: CONFIG.BUSINESS_EMAIL,
    subject: subject,
    htmlBody: `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: ${priorityColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${urgencyLabel}</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Lead Score: ${data.leadScore}/100</p>
        </div>

        <div style="padding: 20px; background: #f5f5f5;">
          <h2 style="color: ${priorityColor};">Booking Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: white;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Booking ID</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${rowId}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Customer Name</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.name}</td>
            </tr>
            <tr style="background: white;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><a href="tel:${data.phone}">${data.phone}</a></td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.email}</td>
            </tr>
            <tr style="background: white;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Vehicle</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.vehicle}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Service Type</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.service.toUpperCase()}</td>
            </tr>
            <tr style="background: white;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Location</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.location}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Preferred Date & Time</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.preferredDate} - ${data.preferredTime}</td>
            </tr>
            ${eventId ? `<tr style="background: #ccffcc;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Calendar Event</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><a href="${calendarLink}" style="color: #00aa00;">✓ Added to Calendar</a></td>
            </tr>` : ''}
            ${data.isFleet ? '<tr style="background: #ccffcc;"><td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;" colspan="2">🚛 FLEET SERVICES REQUEST</td></tr>' : ''}
          </table>

          <h3 style="color: ${priorityColor}; margin-top: 20px;">Customer Notes:</h3>
          <div style="background: white; padding: 15px; border-left: 4px solid ${priorityColor};">
            ${data.details || 'No additional details provided'}
          </div>

          ${data.isEmergency ? '<div style="background: #ff0000; color: white; padding: 15px; margin-top: 20px; text-align: center; font-weight: bold; font-size: 18px;">⚡ RESPOND IMMEDIATELY - EMERGENCY SERVICE ⚡</div>' : '<div style="background: #ff6b00; color: white; padding: 15px; margin-top: 20px; text-align: center;">📞 Call within 1 hour for optimal conversion</div>'}

          <div style="margin-top: 20px; text-align: center;">
            <a href="tel:${data.phone}" style="display: inline-block; background: ${priorityColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">📞 CALL ${data.phone}</a>
          </div>
        </div>

        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Carter Car Mobile Mechanic - Automated Booking System</p>
          <p>Timestamp: ${data.timestamp}</p>
        </div>
      </body>
    </html>
  `
  });
}

// ========================================
// SEND CUSTOMER CONFIRMATION EMAIL
// ========================================
function sendCustomerConfirmation(data) {
  if (!data.email || data.email === 'Not provided') {
    Logger.log('Customer email not provided, skipping confirmation.');
    return;
  }
  const subject = 'Carter Car Mobile Mechanic - Appointment Request Received';

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #ff6b00, #ff4500); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px;">🔧 Carter Car Mobile Mechanic</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Your Appointment Request is Confirmed!</p>
        </div>

        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #ff6b00;">Hi ${data.name},</h2>
          <p style="font-size: 16px;">Thank you for choosing Carter Car Mobile Mechanic! We've received your appointment request and will contact you shortly to confirm the details.</p>

          ${data.isEmergency ? '<div style="background: #ff0000; color: white; padding: 15px; margin: 20px 0; text-align: center; font-weight: bold; border-radius: 5px;">🚨 EMERGENCY REQUEST - We\'ll contact you within 30 minutes! 🚨</div>' : ''}

          <h3 style="color: #ff6b00;">Your Request Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: white;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Vehicle:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${data.vehicle}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service Type:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${data.service}</td>
            </tr>
            <tr style="background: white;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Location:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${data.location}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Preferred Date & Time:</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${data.preferredDate} - ${data.preferredTime}</td>
            </tr>
          </table>

          <div style="background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(255, 107, 0, 0.1)); border: 2px solid #ff6b00; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #ff6b00; margin: 0 0 10px 0;">💳 About Your $45 Service Fee</h3>
            <p style="margin: 0; font-size: 18px; color: #00aa00; font-weight: bold;">✓ 100% Credited Toward Your Repair Bill</p>
            <p style="margin: 10px 0 0 0; color: #333;">The $45 service call fee reserves your appointment and covers our mobile service. <strong>The entire amount is credited to your total repair cost</strong> - you're only paying for parts and labor!</p>
          </div>

          <h3 style="color: #ff6b00;">What Happens Next?</h3>
          <ol style="font-size: 16px; line-height: 1.8;">
            <li><strong>Confirmation Call:</strong> We'll call you at <strong>${data.phone}</strong> ${data.isEmergency ? 'within 30 minutes' : 'within 1 hour'} to confirm your appointment</li>
            <li><strong>Schedule Finalized:</strong> We'll lock in the best time that works for you</li>
            <li><strong>We Come to You:</strong> Our certified mechanic arrives at your location with all necessary tools</li>
            <li><strong>Expert Service:</strong> Quality repair work completed on-site</li>
          </ol>

          <div style="background: #ff6b00; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
            <h3 style="margin: 0 0 10px 0;">Need Immediate Assistance?</h3>
            <p style="margin: 0; font-size: 24px; font-weight: bold;">
              <a href="tel:3176431578" style="color: white; text-decoration: none;">📞 (317) 643-1578</a>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Call or text us anytime</p>
          </div>
        </div>

        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;"><strong>Carter Car Mobile Mechanic</strong></p>
          <p style="margin: 5px 0 0 0;">Professional Mobile Auto Repair - Indianapolis & Surrounding Areas</p>
        </div>
      </body>
    </html>
  `
  });
}

// ========================================
// ERROR REPORTING FUNCTION
// ========================================
function sendErrorReport(data, errorLog) {
  const subject = '❌ ERROR: Carter Car Booking Failed - ' + data.name;
  let htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="background: #d9534f; color: white; padding: 20px;">
          <h1>Booking Processing Error</h1>
        </div>
        <div style="padding: 20px;">
          <p>A booking request from <strong>${data.name}</strong> was processed, but one or more steps failed.</p>
          <p><strong>Customer Data:</strong></p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${JSON.stringify(data, null, 2)}</pre>
          <hr>
          <h2>Failed Steps:</h2>
  `;

  errorLog.forEach(err => {
    htmlBody += `
      <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
        <h3 style="color: #d9534f;">Step: ${err.step}</h3>
        <p><strong>Error:</strong> ${err.error}</p>
        <p><strong>Stack Trace:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; white-space: pre-wrap;">${err.stack || 'Not available'}</pre>
      </div>
    `;
  });

  htmlBody += `
        </div>
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>This is an automated error report. Please check the script logs and configurations.</p>
        </div>
      </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.BUSINESS_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log('Error report sent successfully.');
  } catch (e) {
    Logger.log('FATAL: Could not send the error report email. ' + e.toString());
  }
}
