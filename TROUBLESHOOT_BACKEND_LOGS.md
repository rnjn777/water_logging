# Troubleshooting: Can't See Backend Logs in VS Code Terminal

## Step-by-Step Debugging

### Step 1: Check if Server is Actually Running

In VS Code terminal, make sure you're in the `backend` folder:
```bash
cd backend
pwd  # (or `cd` on Windows) - should show backend directory
```

### Step 2: Try Starting the Server

```bash
npm run dev
```

**What you SHOULD see:**
```
🚀 Server running on port 5001 - v1.1
```

**If you see ERRORS instead:**
- Read the error message carefully
- Common errors:
  - `Cannot find module` → Run `npm install`
  - `Port already in use` → Change PORT in .env or kill other process
  - `Database connection error` → Check DATABASE_URL in .env
  - `Missing .env file` → Create .env file

### Step 3: Check Terminal Tab

- Make sure you're looking at the **correct terminal tab**
- VS Code can have multiple terminals open
- Look for the terminal where you ran `npm run dev`
- The terminal should show a prompt like: `backend> npm run dev`

### Step 4: Test if Server is Running

Open a NEW terminal (Terminal → New Terminal) and test:
```bash
curl http://localhost:5001
```

Or in browser, go to: `http://localhost:5001`

You should see: `Backend running 🚀`

### Step 5: Check for Silent Errors

The server might be crashing silently. Add this to see errors:

In `backend/src/server.js`, add at the top:
```javascript
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### Step 6: Verify Node.js is Installed

```bash
node --version
npm --version
```

If these don't work, install Node.js from https://nodejs.org/

### Step 7: Check Package.json Scripts

Make sure `package.json` has:
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

### Step 8: Manual Test - Add Test Log

Add this to `backend/src/server.js` right after imports:
```javascript
console.log('🔵 TEST: Server file loaded successfully!');
console.log('🔵 TEST: PORT will be:', process.env.PORT || 5001);
```

If you don't see these logs, the file isn't being executed.

## Common Issues & Solutions

### Issue 1: "Command not found: npm"
**Solution:** Install Node.js from https://nodejs.org/

### Issue 2: "Cannot find module"
**Solution:** 
```bash
cd backend
npm install
```

### Issue 3: Server starts but no logs appear
**Solution:** 
- Make sure you're making requests to the server
- Logs only appear when something happens (requests, errors)
- Try accessing `http://localhost:5001` in browser

### Issue 4: Terminal shows nothing
**Solution:**
- Check if terminal is "focused" (click on it)
- Try clearing terminal: Right-click → Clear
- Try closing and reopening terminal

### Issue 5: Wrong directory
**Solution:**
```bash
# Check current directory
pwd  # Linux/Mac
cd   # Windows

# Navigate to backend
cd backend

# Verify you're in right place (should see package.json)
ls package.json  # Linux/Mac
dir package.json # Windows
```

## Quick Test Script

Run this to test everything:
```bash
cd backend
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Checking if node_modules exists..."
ls node_modules 2>/dev/null && echo "✅ node_modules found" || echo "❌ node_modules missing - run npm install"
echo "Starting server..."
npm run dev
```

---

## FastAPI 422 (Unprocessable Entity) when calling /detect

If your frontend or tests get `422` calling `/detect`, it means the request reached the endpoint but didn't match the expected schema. The most common causes are:

- Frontend sent JSON but `/detect` expected `multipart/form-data` with a `file` field.
- Field name mismatch (server expects `file` but client sends `image` or `img`).
- Required fields missing (e.g., `image_url` for `/detect_url`).

What we changed to prevent this:

- `/detect` now accepts:
  - `multipart/form-data` with `file` (UploadFile)
  - `application/json` with `image_url` (preferred) or `image` (base64 string or data URI)
- A validation error handler logs a preview of the raw request body for easy diagnosis.

Quick fixes for the frontend:

- File upload (multipart):
  - const formData = new FormData();
  - formData.append('file', selectedFile);
  - fetch('/detect', { method: 'POST', body: formData });
  - Do NOT set the Content-Type header manually when using FormData.

- JSON (URL):
  - fetch('/detect', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({image_url: 'https://...'}) });

- JSON (base64 image):
  - fetch('/detect', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({image: 'data:image/png;base64,...'}) });

Debugging tips:

- Add logs in the frontend to print the request body and headers before sending.
- Use curl to reproduce and inspect responses:
  - curl -i -X POST "https://YOUR-DETECTOR/detect" -F "file=@/path/to/image.jpg"
  - curl -i -X POST "https://YOUR-DETECTOR/detect" -H "Content-Type: application/json" -d '{"image_url":"https://..."}'

If you'd like, I can add example client snippets to the frontend or run the curl checks against your deployed detector if you share its URL.
