# Fix "Cannot connect to backend at http://localhost:5001"

## Quick Checklist

### ✅ Step 1: Is Backend Running?

Open VS Code terminal and check:

```bash
cd backend
npm run dev
```

**You MUST see:**
```
🚀 Server running on port 5001 - v1.1
🌐 Local URL: http://localhost:5001
```

If you DON'T see this:
- Backend is not running
- There's an error preventing it from starting
- Check the terminal for red error messages

### ✅ Step 2: Test Backend Directly

**Open in browser:** `http://localhost:5001`

**You should see:** "Backend running 🚀"

**If you see:**
- "This site can't be reached" → Backend is NOT running
- "ERR_CONNECTION_REFUSED" → Backend is NOT running
- "Backend running 🚀" → Backend IS working! ✅

### ✅ Step 3: Check Frontend URL

Make sure `frontend/map.html` has:
```javascript
const API_BASE_URL = "http://localhost:5001";
```

(We changed it back to Render, so if testing locally, you need to change it back)

### ✅ Step 4: How Are You Opening Frontend?

**❌ WRONG:** Double-clicking `map.html` file
- Opens as `file:///C:/path/to/map.html`
- CORS will block requests to localhost

**✅ CORRECT:** Use a local server

**Option A: VS Code Live Server**
1. Install "Live Server" extension
2. Right-click `map.html` → "Open with Live Server"
3. Opens at `http://127.0.0.1:5500` or similar

**Option B: Python HTTP Server**
```bash
cd frontend
python -m http.server 8000
# Then open: http://localhost:8000/map.html
```

**Option C: Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
# Then open: http://localhost:8000/map.html
```

## Common Issues

### Issue 1: Backend Not Running
**Symptom:** Error says "Cannot connect to backend"

**Fix:**
1. Open terminal in VS Code
2. `cd backend`
3. `npm run dev`
4. Wait for "Server running on port 5001"
5. Keep terminal open!

### Issue 2: Port Already in Use
**Symptom:** Backend won't start, says "Port 5001 already in use"

**Fix:**
```bash
# Windows - Find what's using port 5001
netstat -ano | findstr :5001

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use different port
# In backend/.env, set: PORT=5002
# In frontend/map.html, change to: http://localhost:5002
```

### Issue 3: Opening HTML as file://
**Symptom:** CORS errors in browser console

**Fix:** Use a local server (see Step 4 above)

### Issue 4: Frontend Still Pointing to Render
**Symptom:** Trying to connect to Render instead of localhost

**Fix:** Change `frontend/map.html` line 1216:
```javascript
const API_BASE_URL = "http://localhost:5001";  // For local testing
```

## Step-by-Step Local Testing Setup

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
**Keep this running!** You should see:
```
🚀 Server running on port 5001 - v1.1
```

### Terminal 2: Frontend Server (if needed)
```bash
cd frontend
python -m http.server 8000
```

### Browser:
1. Open `http://localhost:8000/map.html` (or Live Server URL)
2. Open Developer Tools (F12)
3. Go to Console tab
4. Submit a report
5. Watch both:
   - **Browser Console** (F12) - Frontend logs
   - **VS Code Terminal** - Backend logs

## Debug Commands

### Test Backend is Running:
```bash
curl http://localhost:5001
# Should return: Backend running 🚀
```

### Check Port is Free:
```bash
# Windows
netstat -ano | findstr :5001

# Mac/Linux
lsof -i :5001
```

### Check Backend Logs:
Look in VS Code terminal where you ran `npm run dev`
- You should see: `📥 [REQUEST] POST /api/reports` when you submit

## Quick Fix Script

Run this to set up everything:

```bash
# 1. Start backend
cd backend
npm run dev &
# (Keep this terminal open)

# 2. In new terminal, test backend
curl http://localhost:5001

# 3. If that works, open frontend with Live Server or http-server
```
