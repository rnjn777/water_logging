from fastapi import FastAPI, UploadFile, File, Request
from ultralytics import YOLO
import os
from PIL import Image, ImageDraw
import io
import base64
import urllib.request
from io import BytesIO

app = FastAPI(title="Waterlogging Detector API")

# Load model once at startup
model = YOLO("best.pt")  # your trained model


def _annotate_image_with_boxes(image, boxes):
    draw = ImageDraw.Draw(image)
    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        # draw rectangle
        draw.rectangle([xyxy[0], xyxy[1], xyxy[2], xyxy[3]], outline="red", width=3)
        # draw confidence
        try:
            conf = float(box.conf[0])
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
    # Read uploaded image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Run detection
    results = model(image, conf=0.65, verbose=False)
    boxes = results[0].boxes

    # Apply strict filters
    img_w, img_h = image.size
    base_w, base_h = 640, 640

    waterlogged = False
    detections = []

    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        area_ratio = ((xyxy[2]-xyxy[0]) * (xyxy[3]-xyxy[1])) / (base_w * base_h)
        conf = float(box.conf[0])

        if area_ratio >= 0.01 and conf >= 0.65:  # strict criteria
            waterlogged = True
            detections.append({"conf": conf, "area_ratio": area_ratio})

    processed_image = _annotate_image_with_boxes(image.copy(), boxes) if len(boxes) > 0 else None

    return {
        "waterlogged": waterlogged,
        "confidence": float(boxes.conf[0]) if len(boxes) > 0 else 0.0,
        "detections": detections,
        "image_filename": file.filename,
        "processed_image": processed_image
    }


@app.post("/detect_url")
async def detect_from_url(payload: dict):
    image_url = payload.get('image_url')
    if not image_url:
        return {"error": "Missing image_url"}

    # fetch image bytes
    try:
        with urllib.request.urlopen(image_url, timeout=15) as response:
            data = response.read()
            image = Image.open(BytesIO(data)).convert("RGB")
    except Exception as e:
        return {"error": f"Failed to fetch image: {e}"}

    results = model(image, conf=0.6, verbose=False)
    boxes = results[0].boxes

    img_w, img_h = image.size
    base_w, base_h = 640, 640

    waterlogged = False
    detections = []

    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        area_ratio = ((xyxy[2]-xyxy[0]) * (xyxy[3]-xyxy[1])) / (base_w * base_h)
        conf = float(box.conf[0])

        if area_ratio >= 0.01 and conf >= 0.65:
            waterlogged = True
            detections.append({"conf": conf, "area_ratio": area_ratio})

    processed_image = _annotate_image_with_boxes(image.copy(), boxes) if len(boxes) > 0 else None

    return {
        "waterlogged": waterlogged,
        "confidence": float(boxes.conf[0]) if len(boxes) > 0 else 0.0,
        "detections": detections,
        "processed_image": processed_image,
        "image_url": image_url
    }


@app.get("/")
def root():
    return {"message": "Waterlogging Detector API ready!"}
