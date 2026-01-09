from fastapi import FastAPI, UploadFile, File, Request
from ultralytics import YOLO
import os
from PIL import Image, ImageDraw
import io
import base64
import requests
from io import BytesIO

app = FastAPI(title="Waterlogging Detector API")

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
async def detect_waterlogging(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
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
            "image_filename": file.filename,
            "processed_image": processed_image
        }

    except Exception as e:
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
