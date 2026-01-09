# How to Run Backend Locally in Cursor

## Step-by-Step Instructions

### 1. Open Terminal in Cursor
- Press `` Ctrl + ` `` (backtick) OR
- Go to **Terminal** → **New Terminal** from the menu
- The terminal will open at the bottom of Cursor

### 2. Navigate to Backend Directory
In the terminal, type:
```bash
cd backend
```

### 3. Check if Dependencies are Installed
```bash
npm install
```
(This installs all required packages from package.json)

### 4. Create/Check Environment File
You need a `.env` file in the `backend` folder. If you don't have one:

**Option A: Create manually**
- Right-click `backend` folder → New File → name it `.env`
- Add these variables:
```
DATABASE_URL="your_postgresql_connection_string"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
DETECTOR_URL="https://water-logging-detector.onrender.com/detect_url"
JWT_SECRET="your_secret_key_here"
PORT=5001
```

**Option B: Check if you have environment variables set elsewhere**

### 5. Run the Server
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5001 - v1.1
```

### 6. Watch the Logs
Now when you submit a report from the frontend, you'll see ALL the logs in this terminal:
- ✅ Image uploads
- 🔍 Detector calls
- 📥 Responses
- ❌ Errors

## Quick Commands Reference

```bash
# Navigate to backend
cd backend

# Install dependencies (first time only)
npm install

# Run server in development mode (auto-restarts)
npm run dev

# Run server in production mode
npm start

# Stop server
Press Ctrl + C
```

## Testing the Flow

1. **Keep the terminal open** (you'll see logs here)
2. **Open your frontend** (map.html or index.html in a browser)
3. **Submit a report with an image**
4. **Watch the terminal** - you'll see:
   ```
   ✅ Image uploaded successfully https://res.cloudinary.com/...
   🔍 Calling ML detector at: https://water-logging-detector.onrender.com/detect_url
   📤 Sending Cloudinary URL to detector: https://res.cloudinary.com/...
   🌐 Making fetch request to detector...
   📥 Detector response status: 200 OK
   🔎 Detector response data: {...}
   💧 Detector waterlogged value: true (type: boolean)
   ✅ ML Model detected WATERLOGGING
   ```

## Troubleshooting

### "npm: command not found"
- Install Node.js from https://nodejs.org/
- Restart Cursor after installing

### "Cannot find module"
- Run `npm install` in the backend folder

### "Port 5001 already in use"
- Change PORT in .env to another number (e.g., 5002)
- Or stop the other process using port 5001

### "Database connection error"
- Check your DATABASE_URL in .env
- Make sure your database is running/accessible

### No logs appearing
- Make sure the server is running (you should see "Server running on port...")
- Check that frontend is pointing to `http://localhost:5001` (not the production URL)

## Frontend Configuration

Make sure your frontend is pointing to local backend. Check in `frontend/map.html` or wherever you have:
```javascript
const API_BASE_URL = "http://localhost:5001";  // For local testing
// OR
const API_BASE_URL = "https://water-logging.onrender.com";  // For production
```

For local testing, use `http://localhost:5001`
