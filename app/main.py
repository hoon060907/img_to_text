import io
import easyocr
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np

# Initialize FastAPI application
app = FastAPI(
    title="OCR API Server", 
    description="A simple MLOps OCR API server extracting text from images using EasyOCR",
    version="1.0.0"
)

# CORS 설정 (프론트엔드 연동 시 Network Error 방지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the OCR model globally to avoid reloading on every request
# We are using EasyOCR with Korean ('ko') and English ('en') support.
# gpu=True 셋팅을 통해 CUDA 외장 그래픽 연산을 활성화합니다. (PyTorch CUDA 설치 필요)
print("Loading OCR Model...")
reader = easyocr.Reader(['ko', 'en', 'ja'], gpu=True)
print("OCR Model loaded successfully.")

@app.get("/")
def health_check():
    """Health checkendpoint."""
    return {"status": "ok", "message": "OCR API Server is running."}

@app.post("/ocr/")
async def perform_ocr(file: UploadFile = File(...)):
    """
    Upload an image file and return the extracted text.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        # Read image bytes
        contents = await file.read()
        
        # Load image with Pillow and convert to RGB (to handle PNG transparency etc.)
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # --- [최적화] 이미지 크기 제한 (속도 대폭 향상) ---
        # 스마트폰 사진은 해상도가 너무 커서 CPU로 연산 시 시간이 오래 걸립니다.
        # 비율을 유지한 채 최대 1024px 이하로 줄여 텍스트 추출 시간을 수 초 이내로 단축시킵니다.
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        
        # EasyOCR expects a numpy array
        image_np = np.array(image)
        
        # Perform inference
        # detail=0 returns only the list of extracted text strings
        result = reader.readtext(image_np, detail=0) 
        
        # Join the list of strings into a single text block
        extracted_text = " ".join(result)
        
        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
            "status": "success"
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
