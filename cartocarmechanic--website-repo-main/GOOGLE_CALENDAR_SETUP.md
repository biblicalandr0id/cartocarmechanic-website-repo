# Google Calendar API Setup Instructions

This guide will help you configure the Google Calendar API integration for your Car to Car Mechanic booking system.

## Why You Need This

The Google Calendar API integration enables:
- **Real-time availability checking** - Customers see only available time slots
- **Prevents double bookings** - Automatically blocks busy times
- **Custom calendar styling** - Keep your beautiful design while using Google Calendar backend
- **Automatic calendar event creation** - Bookings are added to your Google Calendar

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your business email: `cartocarmechanic@gmail.com`
3. Click "Select a project" → "New Project"
4. Project Name: `Car To Car Calendar Integration`
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click "Enable"

## Step 3: Create API Credentials

### Create API Key (for reading calendar availability)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (you'll use this in your website)
4. Click "Restrict Key" for security:
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Calendar API"
   - Under "Application restrictions", select "HTTP referrers"
   - Add these referrers:
     - `https://discover-austin.github.io/*`
     - `https://cartocarmechanic.com/*` (if you have a custom domain)
     - `http://localhost:*` (for testing)
5. Click "Save"

### Create OAuth 2.0 Client ID (optional, for advanced features)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "Car To Car Booking System"
   - User support email: `cartocarmechanic@gmail.com`
   - Developer contact: `cartocarmechanic@gmail.com`
4. Application type: "Web application"
5. Name: "Car To Car Website"
6. Authorized JavaScript origins:
   - `https://discover-austin.github.io`
   - `https://cartocarmechanic.com` (if using custom domain)
7. Click "Create"
8. Copy the Client ID

## Step 4: Make Your Google Calendar Public (for availability checking)

1. Go to [Google Calendar](https://calendar.google.com)
2. Sign in with `cartocarmechanic@gmail.com`
3. Click the three dots next to your calendar → "Settings and sharing"
4. Scroll to "Access permissions for events"
5. Check "Make available to public"
6. Under "Access permissions", select "See only free/busy (hide details)"
   - This shows customers when you're busy but keeps appointment details private
7. Scroll down and copy your Calendar ID (it should be `cartocarmechanic@gmail.com`)

## Step 5: Update Your Website Code

1. Open `index.html` in your repository
2. Find the `GOOGLE_CALENDAR_CONFIG` section (around line 24)
3. Replace the placeholder values:

```javascript
const GOOGLE_CALENDAR_CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE', // Paste the API key from Step 3
    calendarId: 'cartocarmechanic@gmail.com', // Your calendar email
    clientId: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com', // Paste OAuth Client ID (optional)
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    scopes: 'https://www.googleapis.com/auth/calendar.readonly'
};
```

4. Save and push your changes to GitHub

## Step 6: Update Google Apps Script (to create calendar events)

The Google Apps Script needs to be updated to automatically create calendar events when bookings are received.

1. Open your Google Apps Script at: [script.google.com](https://script.google.com)
2. Find your "Car To Car CRM" script
3. Open the file `GoogleAppsScript-Updated.js` from your repository
4. **IMPORTANT:** Replace the placeholder values in the CONFIG section with your actual credentials:
   - `YOUR_TWILIO_ACCOUNT_SID` → Your Twilio Account SID
   - `YOUR_TWILIO_AUTH_TOKEN` → Your Twilio Auth Token
   - `+1XXXXXXXXXX` → Your Twilio phone number
5. Copy the entire updated script
6. Replace all code in your Apps Script with the copied code
7. Save and redeploy

### Alternative: Just add the calendar function

If you prefer to keep your existing script and just add calendar functionality, add this function at the bottom of your script:

```javascript
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
    const eventDate = new Date(data.preferredDate);
    const timeParts = data.preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);

    if (timeParts) {
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      eventDate.setHours(hours, minutes, 0, 0);
    }

    // Create 2-hour appointment slot
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2);

    const title = `${data.service} - ${data.name} - ${data.vehicle}`;
    const description = `
Customer: ${data.name}
Phone: ${data.phone}
Email: ${data.email}
Vehicle: ${data.vehicle}
Service: ${data.service}
Location: ${data.location}
Details: ${data.details}
Emergency: ${data.isEmergency ? 'YES' : 'No'}
Lead Score: ${data.leadScore}/100
    `.trim();

    const event = calendar.createEvent(title, eventDate, endDate, {
      description: description,
      location: data.location,
      sendInvites: false
    });

    Logger.log('Calendar event created: ' + event.getId());
    return event.getId();

  } catch (err) {
    Logger.log('Error creating calendar event: ' + err.toString());
    throw new Error('Failed to create calendar event: ' + err.message);
  }
}
```

4. Update the `doPost` function to call this new function. Add this after saving to sheet (around line 40):

```javascript
// 1.5 Create Calendar Event
try {
  const eventId = createCalendarEvent(data);
  Logger.log('Step 1.5/5: Calendar event created. Event ID: ' + eventId);
} catch (err) {
  errorLog.push({ step: 'Create Calendar Event', error: err.message, stack: err.stack });
}
```

5. Update the step numbers for remaining steps (2/5, 3/5, 4/5, 5/5)
6. Save and redeploy your Apps Script

## Step 7: Test the Integration

1. Visit your website
2. Go to the booking form
3. You should see:
   - Your custom-styled calendar
   - Time slots that show "Booked" for times when you have existing calendar events
   - Available slots that can be clicked
4. Complete a test booking
5. Check your Google Calendar - the appointment should appear automatically

## Troubleshooting

### "Calendar API not initialized" message appears
- Check that you've replaced `YOUR_GOOGLE_CALENDAR_API_KEY` with your actual API key
- Open browser console (F12) to see detailed error messages
- Verify the API key restrictions allow your website domain

### All time slots show as available (even when you have appointments)
- Verify your calendar is set to "Make available to public" with "See only free/busy"
- Check that the Calendar ID in the config matches your actual calendar
- The API key must have Google Calendar API enabled

### Calendar events not being created from bookings
- Check the Google Apps Script logs for errors
- Verify the calendar email in CONFIG.BUSINESS_EMAIL is correct
- Make sure you redeployed the Apps Script after adding the new function

### "403 Forbidden" or "API key not valid" errors
- Check that your API key restrictions include your website domain
- Ensure Google Calendar API is enabled in your Google Cloud project
- The calendar must be public (free/busy visible to public)

## Security Best Practices

1. **API Key Restrictions**: Always restrict your API key to specific domains
2. **Calendar Privacy**: Use "See only free/busy" - this prevents customers from seeing private appointment details
3. **OAuth for Admin**: If you need to modify calendar events from the website (not just read), use OAuth 2.0
4. **Rate Limiting**: Google Calendar API has usage limits - for most businesses this won't be an issue

## Cost

- Google Calendar API is **FREE** for normal business use
- Free tier includes: 1,000,000 queries per day
- For a mobile mechanic business, you'll likely use less than 100 queries per day

## Benefits of This Integration

✅ **Prevents Double Bookings** - Real-time availability checking
✅ **Professional Customer Experience** - Custom design + Google Calendar reliability
✅ **Automatic Calendar Management** - Bookings auto-populate your calendar
✅ **Mobile Sync** - Calendar events sync to your phone automatically
✅ **Reduces Customer Anxiety** - Customers see only available times

## Need Help?

If you encounter issues:
1. Check the browser console for error messages (F12 → Console tab)
2. Verify all credentials are entered correctly
3. Test with simple calendar first before adding complex features
4. Review Google Calendar API documentation: https://developers.google.com/calendar

---

**Remember**: The system works in fallback mode (showing all time slots) if the API isn't configured. Customers can still book - they just won't see real-time availability until you complete the setup.
