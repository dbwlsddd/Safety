import uvicorn
import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware # CORS를 위한 import
from ultralytics import YOLO

# --- 1. 애플리케이션 초기화 ---
app = FastAPI(
    title="Safety AI API Server",
    description="YOLOv8 보호구 감지 및 얼굴 인식을 위한 API 서버입니다.",
    version="0.1.0"
)

# --- 2. CORS 설정 (매우 중요!) ---
# 프론트엔드(HTML)가 다른 주소(예: localhost:5500)에서 실행되더라도
# 이 API 서버(예: localhost:8000)에 접근할 수 있도록 허용합니다.
origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5500", # VSCode Live Server 기본 포트
    "null", # 로컬 file:// 에서의 요청을 허용
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # 모든 HTTP 메소드 허용
    allow_headers=["*"], # 모든 HTTP 헤더 허용
)

# --- 3. AI 모델 로드 ---
# !!! 중요: 이 부분을 훈련시킨 'best.pt' 파일 경로로 변경하세요.
# 예: model_ppe = YOLO("path/to/your/best.pt")
try:
    model_ppe = YOLO("best.pt")
    print(">>> 보호구 감지 모델 로드 성공 <<<")
except Exception as e:
    print(f"!!! 모델 로드 실패: {e} !!!")
    # 실제 운영 시에는 모델 로드 실패 시 서버가 시작되지 않도록 처리할 수 있습니다.
    model_ppe = None

# --- 4. 입력 데이터 형식 정의 (Pydantic) ---
# 프론트엔드에서 Base64로 인코딩된 이미지 문자열을 받습니다.
class ImageInput(BaseModel):
    image_base64: str # "data:image/jpeg;base64,..." 또는 순수 Base64 문자열

# --- 5. API 엔드포인트 생성 ---

@app.get("/")
async def read_root():
    """서버가 정상적으로 실행 중인지 확인하는 헬스 체크 엔드포인트입니다."""
    return {"message": "Safety AI Server is running."}

@app.post("/detect_ppe")
async def detect_ppe(input_data: ImageInput):
    """
    Base64 인코딩된 이미지를 받아 보호구 착용 여부를 감지합니다.
    """
    if model_ppe is None:
        raise HTTPException(status_code=500, detail="AI 모델이 로드되지 않았습니다.")

    try:
        # --- Base64 디코딩 ---
        img_str = input_data.image_base64

        # 데이터 URL 접두사(예: "data:image/jpeg;base64,") 제거
        if "," in img_str:
            img_str = img_str.split(",")[1]

        # Base64 문자열을 바이너리 데이터로 디코딩
        img_data = base64.b64decode(img_str)

        # 바이너리 데이터를 NumPy 배열로 변환
        nparr = np.frombuffer(img_data, np.uint8)

        # NumPy 배열을 OpenCV 이미지로 변환
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv is None:
            raise HTTPException(status_code=400, detail="유효하지 않은 이미지 데이터입니다.")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 디코딩 실패: {str(e)}")

    try:
        # --- YOLO 모델 추론 ---
        results = model_ppe(img_cv)

        # --- 결과 포맷팅 ---
        # 로드맵에서 요청한 JSON 형식: {"detections": [{"label": "helmet", "box": [x, y, w, h]}, ...]}
        detections = []

        if results and results[0].boxes:
            for box in results[0].boxes:
                # 클래스 ID와 이름
                cls_id = int(box.cls[0])
                label = model_ppe.names[cls_id]

                # 좌표 (x1, y1, x2, y2)
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                # 좌표를 (top-left x, top-left y, width, height)로 변환
                box_data = [
                    x1,
                    y1,
                    x2 - x1, # width
                    y2 - y1  # height
                ]

                # 신뢰도
                confidence = float(box.conf[0])

                detections.append({
                    "label": label,
                    "box": box_data,
                    "confidence": confidence
                })

        return {"detections": detections}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 추론 중 오류 발생: {str(e)}")

# --- 6. 서버 실행 (터미널에서 uvicorn을 직접 실행하는 것을 권장) ---
# 이 파일이 직접 실행될 때 (예: python main.py)
# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
#
# 터미널 명령어 권장:
# uvicorn main:app --reload --port 8000
