# Fix "Failed to Fetch" Error When Running Locally

## Quick Fixes

### Issue 1: Port Mismatch ✅ FIXED
**Problem:** Frontend was using port 5002, backend uses 5001

**Fixed:** Changed `map.html` to use `http://localhost:5001`

### Issue 2: Backend Not Running
**Check if backend is running:**
```bash
cd backend
npm run dev
```

**You should see:**
```
🚀 Server running on port 5001 - v1.1
🌐 Local URL: http://localhost:5001
```

**Test backend:**
- Open browser: `http://localhost:5001`
- Should see: "Backend running 🚀"

### Issue 3: Opening HTML File Directly (file://)
**Problem:** If you open `map.html` directly (double-click), CORS will fail

**Solution:** Use a local server:

**Option A: Use VS Code Live Server Extension**
1. Install "Live Server" extension in VS Code
2. Right-click `map.html` → "Open with Live Server"
3. Usually opens at `http://127.0.0.1:5500` or similar

**Option B: Use Python HTTP Server**
```bash
cd frontend
python -m http.server 8000
# Then open: http://localhost:8000/map.html
```

**Option C: Use Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
# Then open: http://localhost:8000/map.html
```

### Issue 4: CORS Issues
**Fixed:** Updated CORS configuration in `server.js` to allow localhost origins

If still having issues, check browser console for CORS errors:
- Press F12 → Console tab
- Look for red errors mentioning "CORS" or "Access-Control-Allow-Origin"

### Issue 5: Browser Cache
**Solution:** Hard refresh browser
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
- Clear browser cache

## Step-by-Step Testing

### 1. Start Backend
```bash
cd backend
npm run dev
```

**Verify:** Terminal shows:
```
🚀 Server running on port 5001 - v1.1
```

### 2. Test Backend Manually
Open in browser: `http://localhost:5001`

**Should see:** "Backend running 🚀"

### 3. Open Frontend with Local Server
**Don't double-click the HTML file!**

Use Live Server or http-server (see Issue 3 above)

### 4. Check Browser Console
- Press F12
- Go to Console tab
- Submit a report
- Look for:
  - ✅ Green logs: `🌐 Submitting report to: http://localhost:5001/api/reports`
  - ❌ Red errors: Show the actual error

### 5. Check Backend Terminal
When you submit, you should see:
```
📥 [REQUEST] POST /api/reports - Origin: http://127.0.0.1:5500
```

## Common Error Messages

### "Failed to fetch"
**Possible causes:**
- Backend not running
- Wrong port number
- CORS issue
- Network error

**Fix:** Check all items in Step-by-Step Testing above

### "NetworkError"
**Possible causes:**
- Backend crashed
- Port already in use
- Firewall blocking connection

**Fix:**
```bash
# Check if port 5001 is in use
netstat -ano | findstr :5001  # Windows
lsof -i :5001                 # Mac/Linux

# Kill process if needed, then restart backend
```

### "CORS policy" error
**Already fixed** - CORS is configured in `server.js`

If still seeing it:
- Make sure you're using a local server (not file://)
- Check backend terminal shows the request is received
- Verify CORS middleware is enabled

## Debug Checklist

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Backend accessible at `http://localhost:5001`
- [ ] Frontend uses `API_BASE_URL = "http://localhost:5001"`
- [ ] Frontend opened via local server (not file://)
- [ ] Browser console shows detailed error (F12 → Console)
- [ ] Backend terminal shows incoming requests
- [ ] No port conflicts (5001 is free)

## Enhanced Logging

The code now includes detailed logging:

**Frontend (Browser Console - F12):**
- `🌐 Submitting report to: [URL]`
- `📤 Payload size: [bytes]`
- `📥 Response status: [status]`
- `❌ Error details` (if error occurs)

**Backend (VS Code Terminal):**
- `📥 [REQUEST] POST /api/reports`
- `✅ Image uploaded successfully`
- `🔍 Calling ML detector`
- All ML processing logs

## Still Not Working?

1. **Check browser console** (F12) - what's the exact error?
2. **Check backend terminal** - is it receiving requests?
3. **Test backend directly:**
   ```bash
   curl http://localhost:5001
   # Should return: Backend running 🚀
   ```
4. **Check network tab** (F12 → Network):
   - Is request being sent?
   - What's the response status?
   - What's the response body?
