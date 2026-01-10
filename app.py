from fastapi import FastAPI, UploadFile, File, Request
from ultralytics import YOLO
import os
from PIL import Image, ImageDraw
import io
import base64
import requests
from io import BytesIO

app = FastAPI(title="Waterlogging Detector API")

# Helpful validation error handler to log raw bodies and return clearer messages (helps diagnose 422s)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_body = None
    try:
        raw_body = (await request.body()).decode('utf-8', errors='replace')
    except Exception:
        raw_body = None
    print("❌ [VALIDATION] RequestValidationError:", exc.errors())
    print("❌ [VALIDATION] RAW BODY (truncated):", raw_body[:1000] if raw_body else raw_body)
    return JSONResponse(status_code=422, content={
        "detail": "Request validation failed. See 'errors' for details.",
        "errors": exc.errors(),
        "raw_body_preview": raw_body[:1000] if raw_body else None
    })

print("\n" + "="*60)
print("🚀 WATERLOGGING DETECTOR API STARTING UP")
print("="*60)

# Load model once at startup
print("📦 Loading YOLO model from best.pt...")
model = YOLO("best.pt")  # your trained model
print("✅ YOLO model loaded successfully")
print("="*60 + "\n")


def _annotate_image_with_boxes(image, boxes):
    draw = ImageDraw.Draw(image)
    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        # draw rectangle
        draw.rectangle([xyxy[0], xyxy[1], xyxy[2], xyxy[3]], outline="red", width=3)
        # draw confidence
        try:
            conf = float(box.conf[0].item())
            draw.text((xyxy[0], max(0, xyxy[1]-12)), f"{conf:.2f}", fill="yellow")
        except Exception:
            pass

    buf = BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{encoded}"


@app.post("/detect")
async def detect_waterlogging(request: Request, file: UploadFile = File(None)):
    """Accepts either:
    - multipart/form-data with a field `file` (UploadFile)
    - application/json with `image_url` or `image` (base64 data URI or raw base64)

    This prevents 422 errors when callers send JSON to `/detect` by mistake.
    """
    try:
        # If a file was uploaded via multipart/form-data, use it
        if file is not None:
            print(f"🔍 [/detect] Received multipart file: {file.filename}")
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        else:
            # No file object — inspect the request body and content type
            content_type = (request.headers.get('content-type') or '').lower()
            print(f"🔍 [/detect] No UploadFile. Content-Type: {content_type}")

            if 'application/json' in content_type:
                payload = await request.json()
                # support image_url (preferred)
                image_url = payload.get('image_url') if isinstance(payload, dict) else None
                image_b64 = payload.get('image') if isinstance(payload, dict) else None

                if image_url:
                    print(f"🔍 [/detect] Got image_url in JSON: {image_url}")
                    # delegate to detect_from_url logic
                    return await detect_from_url({'image_url': image_url})

                if image_b64:
                    print("🔍 [/detect] Got base64 image in JSON; decoding...")
                    b64 = image_b64
                    if isinstance(b64, str) and b64.startswith('data:image'):
                        b64 = b64.split(',', 1)[1]
                    contents = base64.b64decode(b64)
                    image = Image.open(io.BytesIO(contents)).convert("RGB")
                else:
                    return {"error": "JSON body must include 'image_url' or 'image' (base64)."}

            elif 'multipart/form-data' in content_type:
                # If client sent form data but without a file field, try to parse form and look for image_url
                form = await request.form()
                if 'image_url' in form:
                    return await detect_from_url({'image_url': form.get('image_url')})
                return {"error": "multipart/form-data received but no 'file' field present."}

            else:
                # Try to parse raw body as JSON as a best-effort (some clients omit headers)
                try:
                    payload = await request.json()
                    if isinstance(payload, dict) and 'image_url' in payload:
                        return await detect_from_url(payload)
                except Exception:
                    pass
                return {"error": "Unsupported request format. Send multipart form with 'file', or JSON with 'image_url' or 'image'."}

        # Normalize and resize image similar to previous behavior
        image = image.resize((640, 640))

        # YOLO inference
        try:
            results = model(image, conf=0.1, verbose=False)
            boxes = results[0].boxes
        except Exception as e:
            return {
                "error": f"Model inference failed: {e}",
                "waterlogged": None,
                "detections": [],
                "processed_image": None
            }

        waterlogged = False
        detections = []

        for box in boxes:
            xyxy = box.xyxy[0].cpu().numpy()
            area_ratio = float(
                ((xyxy[2] - xyxy[0]) * (xyxy[3] - xyxy[1])) / (640 * 640)
            )
            conf = float(box.conf[0].item())

            if area_ratio >= 0.001 and conf >= 0.1:
                waterlogged = True
                detections.append({
                    "conf": conf,
                    "area_ratio": area_ratio
                })

        # confidence (JSON-safe)
        confidence = 0.0
        if len(boxes) > 0:
            try:
                confidence = float(boxes[0].conf[0].item())
            except Exception:
                confidence = 0.0

        # processed image (non-fatal)
        processed_image = None
        try:
            if len(boxes) > 0:
                processed_image = _annotate_image_with_boxes(image.copy(), boxes)
        except Exception as e:
            print(f"⚠️ Image annotation failed: {e}")

        return {
            "waterlogged": waterlogged,
            "confidence": confidence,
            "detections": detections,
            "image_filename": getattr(file, 'filename', None),
            "processed_image": processed_image
        }

    except Exception as e:
        print(f"❌ [/detect] Exception while processing: {e}")
        return {
            "error": str(e),
            "waterlogged": False,
            "detections": [],
            "processed_image": None
        }


@app.post("/detect_url")
async def detect_from_url(payload: dict):
    image_url = payload.get('image_url')
    print(f"🔍 [/detect_url] Received request for image: {image_url}")
    
    if not image_url:
        print("⚠️ [/detect_url] Missing image_url in payload")
        return {"error": "Missing image_url", "waterlogged": False, "detections": [], "processed_image": None}

    # fetch image bytes
    try:
        print(f"📥 [/detect_url] Fetching image from URL...")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(image_url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.content
        image = Image.open(BytesIO(data)).convert("RGB")
        print(f"✅ [/detect_url] Image fetched successfully: {image.size}")
    except Exception as e:
        print(f"❌ [/detect_url] Failed to fetch image: {e}")
        return {"error": f"Failed to fetch image: {e}", "waterlogged": None, "detections": [], "processed_image": None}

    results = model(image, conf=0.1, verbose=False)
    boxes = results[0].boxes

    img_w, img_h = image.size
    base_w, base_h = 640, 640

    waterlogged = False
    detections = []

    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        area_ratio = ((xyxy[2]-xyxy[0]) * (xyxy[3]-xyxy[1])) / (base_w * base_h)
        conf = float(box.conf[0].item())


        if area_ratio >= 0.005 and conf >= 0.5:
            waterlogged = True
            detections.append({
                "conf": float(conf),
                "area_ratio": float(area_ratio)
            })
            print(f"  ✓ Box {len(detections)}: conf={conf:.3f}, area_ratio={area_ratio:.4f}")

    processed_image = None
    try:
        if len(boxes) > 0:
            processed_image = _annotate_image_with_boxes(image.copy(), boxes)
            print(f"✅ Processed image generated successfully")
    except Exception as e:
        print(f"⚠️ Image annotation failed (will continue without it): {e}")
        processed_image = None

    # Calculate max confidence from all detections
    max_confidence = 0.0
    if len(boxes) > 0 and len(detections) > 0:
        max_confidence = max([d["conf"] for d in detections])
    elif len(boxes) > 0:
        # Fallback: get confidence from first box if no detections passed filter
        try:
            max_confidence = float(boxes[0].conf[0].item()) if hasattr(boxes[0], 'conf') else 0.0
        except:
            max_confidence = 0.0
    
    result = {
        "waterlogged": waterlogged,
        "confidence": max_confidence,
        "detections": detections,
        "processed_image": processed_image,
        "image_url": image_url
    }
    
    print(f"✅ [/detect_url] Response: waterlogged={waterlogged}, detections={len(detections)}, has_processed_image={processed_image is not None}")
    return result


@app.get("/")
def root():
    return {"message": "Waterlogging Detector API ready!"}
