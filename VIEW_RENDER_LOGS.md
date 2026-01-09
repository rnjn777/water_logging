# How to View Backend Logs on Render

## Option 1: View Logs in Render Dashboard (Production)

### Steps:
1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Log in to your account

2. **Find Your Backend Service**
   - Click on your backend service (probably named "water-logging" or similar)

3. **View Logs**
   - Click on **"Logs"** tab in the left sidebar
   - OR click on **"Events"** tab to see recent events
   - You'll see all `console.log()` statements here in real-time!

4. **Real-time Log Streaming**
   - Render shows logs as they happen
   - You'll see:
     - ✅ Image upload confirmations
     - 🔍 Detector calls
     - 📥 Detector responses
     - ❌ Any errors

### What You'll See:
```
🚀 Server running on port 5001 - v1.1
✅ Image uploaded successfully https://res.cloudinary.com/...
🔍 Calling ML detector at: https://water-logging-detector.onrender.com/detect_url
📤 Sending Cloudinary URL to detector: https://res.cloudinary.com/...
🌐 Making fetch request to detector...
📥 Detector response status: 200 OK
🔎 Detector response data: {...}
```

## Option 2: Run Backend Locally (For Testing)

If you want to see logs in VS Code terminal while testing:

### Steps:
1. **Stop using Render temporarily** (or run both - local for testing, Render for production)

2. **Run locally in VS Code:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Update frontend to point to local backend:**
   In `frontend/map.html`, change:
   ```javascript
   const API_BASE_URL = "http://localhost:5001";  // For local testing
   ```

4. **Now you'll see logs in VS Code terminal!**

## Option 3: Use Both (Recommended for Development)

- **Render**: Keep running for production/testing
- **Local**: Run locally when you want to debug and see logs quickly

### Setup:
1. Keep Render running (production)
2. Run local server on different port:
   ```bash
   cd backend
   # Create .env.local with PORT=5002
   PORT=5002 npm run dev
   ```
3. Test locally with `http://localhost:5002`
4. See logs in VS Code terminal!

## Render Logs Features

### Log Retention:
- Render keeps logs for a limited time (usually 7-30 days)
- Older logs may be archived

### Log Levels:
- All `console.log()` → Info level
- All `console.error()` → Error level (highlighted in red)
- Server errors → Automatically logged

### Filtering:
- You can search/filter logs in Render dashboard
- Look for specific keywords like "Detector" or "Image uploaded"

## Quick Access to Render Logs

**Direct URL pattern:**
```
https://dashboard.render.com/web/[your-service-id]/logs
```

Or:
1. Dashboard → Your Service → Logs tab

## Troubleshooting Render Logs

### Issue: "No logs showing"
- **Check**: Is the service running? (Green status)
- **Check**: Are you making requests? (Logs only appear when something happens)
- **Check**: Try refreshing the logs page

### Issue: "Logs are delayed"
- Render logs can have a 1-2 second delay
- Keep the logs tab open and watch for new entries

### Issue: "Can't find my service"
- Check all services in your Render dashboard
- Look for the service that matches your backend URL

## Best Practice for Debugging

1. **For quick debugging**: Run locally in VS Code
2. **For production issues**: Check Render logs
3. **For ML detector issues**: Check both - local logs show detailed info, Render shows production behavior
