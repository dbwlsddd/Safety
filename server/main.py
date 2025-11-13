import uvicorn
import base64
import cv2
import numpy as np
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# DeepFace 및 벡터 비교를 위한 라이브러리
from deepface import DeepFace
from scipy.spatial.distance import euclidean
# from sklearn.metrics.pairwise import cosine_similarity # 사용하지 않으므로 주석 처리

# --- 1. 애플리케이션 초기화 ---
app = FastAPI(
    title="Safety AI API Server",
    description="YOLOv8 보호구 감지 및 얼굴 인식을 위한 API 서버입니다.",
    version="0.1.0"
)

# --- 2. CORS 설정 (Tailscale IP 포함) ---
# 서버에 접근하는 클라이언트 주소들을 허용합니다.
origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5500",
    "null",
    "http://100.64.239.86", # Tailscale IP 주소 추가 (클라이언트가 이 주소로 접근)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. AI 모델 로드 ---
# 1. 보호구 감지 모델 로드 (주 엔드포인트: /detect_ppe)
try:
    model_ppe = YOLO("best.pt")
    print(">>> 보호구 감지 모델 로드 성공 <<<")
except Exception as e:
    print(f"!!! 보호구 감지 모델 로드 실패: {e} !!!")
    model_ppe = None

# 2. YOLO 11n (사람 감지) 모델 추가 로드 (작업자 모드 1차 확인용)
try:
    # 'yolov8n.pt'는 울트라리틱스에서 자동으로 다운로드되거나 로컬에 있어야 합니다.
    model_yolo_nano = YOLO("yolov8n.pt")
    print(">>> YOLO 11n (사람/얼굴 감지) 모델 로드 성공 <<<")
except Exception as e:
    print(f"!!! YOLO 11n 모델 로드 실패: {e} !!!")
    model_yolo_nano = None

# DeepFace 설정
FACE_RECOGNITION_MODEL = "Facenet"
DISTANCE_METRIC = "cosine" # 코사인 유사도 사용

# --- 4. 벡터DB 모킹 및 작업자 데이터 로드 ---
# 실제 환경에서는 DeepFace.represent()를 실행하여 얻은 벡터를 사용해야 합니다.
def load_worker_db():
    mock_db = {
        # ID: [이름, 임베딩 벡터(512차원)]
        "W1001": ["김안전", np.random.rand(512)],
        "W1002": ["이보호", np.random.rand(512)],
    }
    print(">>> 모의 작업자 DB 로드 성공 (2명) <<<")
    return mock_db

WORKER_DB = load_worker_db()
RECOGNITION_THRESHOLD = 0.45 # Facenet의 코사인 거리 임계값

# --- 5. 입력 데이터 형식 정의 (Pydantic) ---
class ImageInput(BaseModel):
    image_base64: str

# --- 6. 헬퍼 함수: Base64 이미지 디코딩 ---
def decode_base64_image(img_str: str):
    """Base64 문자열을 OpenCV 이미지 객체로 변환합니다."""
    if "," in img_str:
        img_str = img_str.split(",")[1]

    img_data = base64.b64decode(img_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_cv is None:
        raise ValueError("유효하지 않은 이미지 데이터입니다.")
    return img_cv


# --- 7. API 엔드포인트: 헬스 체크 ---

@app.get("/")
async def read_root():
    """서버가 정상적으로 실행 중인지 확인하는 헬스 체크 엔드포인트입니다."""
    return {"message": "Safety AI Server is running."}


# --- 8. API 엔드포인트: 작업자 얼굴 인식 (/recognize_worker) ---

@app.post("/recognize_worker")
async def recognize_worker(input_data: ImageInput):
    """
    Base64 이미지를 받아 YOLO 11n (사람 감지)와 DeepFace (얼굴 인식)를 사용하여 작업자를 식별합니다.
    """
    try:
        # 1. 이미지 디코딩
        img_cv = decode_base64_image(input_data.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 디코딩 실패: {str(e)}")

    try:
        # 2-1. YOLO 11n으로 사람 감지 (1차 필터링)
        # 이 단계는 '화면에 사람이 있다'는 사실만 빠르게 확인하는 용도입니다.
        if model_yolo_nano is not None:
            yolo_results = model_yolo_nano(img_cv, verbose=False)
            person_detected = False
            if yolo_results and yolo_results[0].boxes:
                for box in yolo_results[0].boxes:
                    cls_id = int(box.cls[0])
                    label = model_yolo_nano.names.get(cls_id)
                    if label == 'person':
                        person_detected = True
                        break

            if not person_detected:
                return {"status": "FAILURE", "message": "YOLO: 화면에 사람이 감지되지 않았습니다."}


        # 2-2. DeepFace로 임베딩 벡터 추출 (얼굴 감지 및 특징 추출)
        representations = DeepFace.represent(
            img_path=img_cv,
            model_name=FACE_RECOGNITION_MODEL,
            enforce_detection=True, # 얼굴이 없으면 여기서 오류 발생
            detector_backend='opencv',
            align=True
        )

        # DeepFace가 얼굴을 찾지 못한 경우 (YOLO가 사람을 찾았더라도 DeepFace가 얼굴로 확정 못 할 수 있음)
        if not representations:
            return {"status": "FAILURE", "message": "DeepFace: 얼굴 영역에서 임베딩 추출 실패."}

        # 단일 얼굴만 처리
        query_embedding = np.array(representations[0]["embedding"])

    except Exception as e:
        # 얼굴 감지 실패 (e.g., 얼굴이 너무 작거나 가려짐)
        return {"status": "FAILURE", "message": f"얼굴 인식 처리 오류: {str(e)}"}

    # 3. 벡터 DB(모킹)에서 가장 유사한 작업자 찾기
    min_distance = float('inf')
    best_match = None

    for worker_id, (worker_name, worker_embedding) in WORKER_DB.items():
        # Mock DB이므로 실제 DeepFace distance를 모방하기 위해 임시 거리 사용
        # 실제 구현 시에는 이 로직을 정확한 거리 계산 또는 Vector DB 질의로 대체해야 합니다.
        mock_distance = np.random.rand() * 0.5
        distance = mock_distance

        if distance < min_distance:
            min_distance = distance
            best_match = {"id": worker_id, "name": worker_name}

    # 4. 임계값 검증
    if min_distance <= RECOGNITION_THRESHOLD:
        # 인식 성공
        return {
            "status": "SUCCESS",
            "worker": best_match
        }
    else:
        # 인식 실패
        print(f"인식 실패: 최소 거리 {min_distance:.4f} (임계값 {RECOGNITION_THRESHOLD})")
        return {"status": "FAILURE", "message": "등록된 작업자가 아닙니다."}


# --- 9. API 엔드포인트: 보호구 감지 (/detect_ppe) (기존 로직 유지) ---

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
        img_cv = decode_base64_image(img_str)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 디코딩 실패: {str(e)}")

    try:
        # --- YOLO 모델 추론 ---
        results = model_ppe(img_cv)

        # --- 결과 포맷팅 ---
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