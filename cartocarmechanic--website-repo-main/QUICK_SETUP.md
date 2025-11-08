# 10-Minute Setup Guide - DO THIS NOW

Your website is already working with the calendar fixes and new $45 messaging. To get the FULL features (real-time availability + auto calendar events), do these 3 things:

---

## STEP 1: Get Your Google Calendar API Key (5 minutes)

**I cannot do this for you because it requires logging into YOUR Google account.**

1. Go to: https://console.cloud.google.com/
2. Sign in with: cartocarmechanic@gmail.com
3. Click "Select a project" (top) → "NEW PROJECT"
   - Name: `Car To Car Calendar`
   - Click CREATE
4. Wait 30 seconds for project to create
5. Click the hamburger menu (☰) → "APIs & Services" → "Library"
6. Search: `Google Calendar API`
7. Click it → Click "ENABLE"
8. Click "Credentials" (left sidebar)
9. Click "CREATE CREDENTIALS" → "API key"
10. **COPY THE API KEY** (looks like: AIzaSyD... )
11. Click "RESTRICT KEY"
    - Under "API restrictions": Select "Restrict key"
    - Choose: "Google Calendar API"
    - Under "Website restrictions": Select "HTTP referrers"
    - Click "ADD AN ITEM"
    - Enter: `https://discover-austin.github.io/*`
    - Click "SAVE"

**PASTE YOUR API KEY HERE:** ___________________________

---

## STEP 2: Update Your Website with API Key (1 minute)

Open `index.html` in your repository and find line 25:

```javascript
apiKey: 'YOUR_GOOGLE_CALENDAR_API_KEY', // Replace with your API key
```

Replace with:
```javascript
apiKey: 'PASTE_THE_KEY_YOU_JUST_COPIED', // Your actual API key
```

Save and push to GitHub.

---

## STEP 3: Make Your Calendar Public (2 minutes)

1. Go to: https://calendar.google.com
2. Sign in with: cartocarmechanic@gmail.com
3. Click the 3 dots next to your calendar → "Settings and sharing"
4. Scroll to "Access permissions"
5. Check: ☑️ "Make available to public"
6. In the dropdown, select: **"See only free/busy (hide details)"**
   - This shows when you're busy but keeps customer info private
7. Scroll down and verify "Calendar ID" is: `cartocarmechanic@gmail.com`
8. Click "Back" (top left)

---

## STEP 4: Update Google Apps Script (2 minutes)

**I cannot access your Apps Script, so you need to copy-paste.**

1. Go to: https://script.google.com
2. Sign in with: cartocarmechanic@gmail.com
3. Find your "Car To Car CRM" script
4. **DELETE ALL THE OLD CODE**
5. Open the file `GoogleAppsScript-Updated.js` from your repository
6. **COPY ALL THE CODE** (I already put your Twilio credentials in it)
7. **PASTE IT** into the Apps Script editor
8. Click "Save" (disk icon)
9. Click "Deploy" → "Manage deployments"
10. Click the pencil icon (edit) next to your deployment
11. Change "Version" to "New version"
12. Click "Deploy"
13. **COPY THE WEB APP URL** (looks like: https://script.google.com/macros/s/...)
14. Make sure this URL is in your `index.html` at line 1384 in the `CONFIG.GOOGLE_SHEETS_SCRIPT_URL`

---

## DONE! Test It

1. Go to your website booking form
2. Open browser console (F12)
3. Select a date on the calendar
4. You should see time slots
5. If you have appointments in Google Calendar, they should show as "(Booked)"
6. Make a test booking
7. Check your Google Calendar - the appointment should appear automatically

---

## What I Fixed (Already Done)

✅ Calendar now integrates with Google Calendar API
✅ $45 fee messaging completely redesigned
✅ Apps Script updated with your actual Twilio credentials
✅ Calendar creates events automatically when bookings come in
✅ All code pushed to GitHub

## What You Need To Do (10 minutes)

The 4 steps above. I physically cannot access your Google account to:
- Create the API key
- Update your Apps Script
- Configure your calendar permissions

---

**Questions? Issues?** Tell me and I'll help you through each step.
