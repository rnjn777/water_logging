# Local Testing Guide - Viewing Server Logs

## Running the Backend Server Locally

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies (if not already done)
```bash
npm install
```

### Step 3: Set Up Environment Variables
Make sure you have a `.env` file in the `backend` directory with:
```
DATABASE_URL="your_database_url"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
DETECTOR_URL="http://localhost:8000/detect_url"  # or your ML service URL
JWT_SECRET="your_jwt_secret"
PORT=5001
```

### Step 4: Run the Server
**Option A: Development mode (auto-restarts on changes)**
```bash
npm run dev
```

**Option B: Production mode**
```bash
npm start
```

### Step 5: Watch the Terminal
All console.log statements will appear in the terminal! You'll see:
- ✅ Image upload confirmations
- 🔍 Detector call logs
- 📤 Cloudinary URLs being sent
- 📥 Detector responses
- ❌ Any errors

## Testing the Image Upload Flow

1. **Start the backend server** (terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

2. **Open your frontend** in a browser (or run a local server)

3. **Submit a report with an image** through the frontend

4. **Watch the terminal** - you'll see logs like:
   ```
   ✅ Image uploaded successfully https://res.cloudinary.com/...
   🔍 Calling ML detector at: http://localhost:8000/detect_url
   📤 Sending Cloudinary URL to detector: https://res.cloudinary.com/...
   🌐 Making fetch request to detector...
   📥 Detector response status: 200 OK
   🔎 Detector response data: { waterlogged: true, ... }
   💧 Detector waterlogged value: true (type: boolean)
   ✅ ML Model detected WATERLOGGING
   ```

## Common Issues to Look For

### Issue 1: Detector Not Reachable
If you see:
```
❌ Detector request failed: fetch failed
❌ Detector URL was: http://localhost:8000/detect_url
```
→ Your ML service (app.py) is not running or not accessible

### Issue 2: Detector Timeout
If you see:
```
❌ Detector request failed with exception: Detector request timeout after 60 seconds
```
→ The ML service is taking too long or not responding

### Issue 3: Detector Error Response
If you see:
```
❌ Detector returned error in response: Failed to fetch image
```
→ The ML service can't download the image from Cloudinary

### Issue 4: No Detector Call
If you DON'T see any detector logs:
→ Check if `imageBase64` is being sent from frontend
→ Check if Cloudinary upload succeeded

## Running the ML Service Locally (app.py)

If you want to test the full flow locally, you also need to run the ML service:

**Terminal 2:**
```bash
# Make sure you have Python and required packages
pip install fastapi uvicorn ultralytics pillow requests

# Run the ML service
uvicorn app:app --reload --port 8000
```

Then set in your backend `.env`:
```
DETECTOR_URL=http://localhost:8000/detect_url
```

## Quick Debug Checklist

- [ ] Backend server is running (see "Server running on port 5001")
- [ ] Frontend can connect to backend (check browser console)
- [ ] Image is being uploaded (see "✅ Image uploaded successfully")
- [ ] Detector is being called (see "🔍 Calling ML detector")
- [ ] Detector responds (see "📥 Detector response status")
- [ ] Waterlogged value is set correctly (see "💧 Detector waterlogged value")
