import io
import os
import cv2
import numpy as np
import base64
import json
import psycopg2
import psycopg2.extras
from PIL import Image
from deepface import DeepFace

# 🔥 YOLO 모델 임포트
from ultralytics import YOLO

# FastAPI 관련 임포트
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

# -----------------------------------------------------------------
# 🛠️ CORS 설정
# -----------------------------------------------------------------
origins = [
    "https://100.64.239.86:3000",
    "https://localhost:3000",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# 설정값
# -------------------------------------------------------------------------
RECOGNITION_THRESHOLD = 0.6
FACE_MODEL_NAME = "ArcFace"
PPE_MODEL_PATH = "best.pt"

PPE_MAPPING = {
    "safety-helmet": "헬멧",
    "vest": "조끼",
    "safety-shoes": "안전화",
    "Protective clothing": "방호복",
    "Harness": "하네스",
    "safety-glasses": "보호경",
    "Face Shield": "페이스 쉴드",
    "Mask": "일반 마스크",
    "dust mask": "방진 마스크",
    "gas mask": "방독 마스크"
}

# -------------------------------------------------------------------------
# 🔥 보호구 감지 모델 로드
# -------------------------------------------------------------------------
try:
    ppe_model = YOLO(PPE_MODEL_PATH)
    print(f"[PPE 모델 로드 성공] 경로: {PPE_MODEL_PATH}")
except Exception as e:
    print(f"[PPE 모델 로드 실패] 오류: {e}")
    ppe_model = None

# -------------------------------------------------------------------------
# DB 연결 함수
# -------------------------------------------------------------------------
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "100.64.239.86"),
        database=os.getenv("DB_NAME", "safety_db"),
        user=os.getenv("DB_USER", "safety_admin"),
        password=os.getenv("DB_PASS", "jiji0424"),
        port=os.getenv("DB_PORT", "5432")
    )

# -------------------------------------------------------------------------
# Base64 → OpenCV 이미지 변환
# -------------------------------------------------------------------------
def base64_to_cv2_image(base64_str):
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]

        img_data = base64.b64decode(base64_str)
        img_bytes = io.BytesIO(img_data)
        img = Image.open(img_bytes)
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"이미지 디코딩 오류: {e}")
        return None

# -------------------------------------------------------------------------
# 🔥 보호구 감지 추론 함수
# -------------------------------------------------------------------------
def detect_ppe_dynamic(cv2_image, required_list):
    if ppe_model is None:
        return {"is_safe": False, "detections": []}

    try:
        results = ppe_model(cv2_image, conf=0.5, verbose=False)
        detections = []
        detected_korean_labels = set()

        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy().astype(int)
            classes = r.boxes.cls.cpu().numpy().astype(int)
            names = r.names

            for box, cls_id in zip(boxes, classes):
                english_label = names[cls_id]
                korean_label = PPE_MAPPING.get(english_label, english_label)
                detected_korean_labels.add(korean_label)

                detections.append({
                    "box": box.tolist(),
                    "label": korean_label,
                    "raw_label": english_label,
                    "class_id": int(cls_id)
                })

        is_safe = all(item in detected_korean_labels for item in required_list)

        return {
            "is_safe": is_safe,
            "detections": detections
        }

    except Exception as e:
        print(f"보호구 감지 오류: {e}")
        return {"is_safe": False, "detections": []}

# -------------------------------------------------------------------------
# 🛠️ [수정됨] 얼굴 벡터 추출 API (등록 시 사용)
# -------------------------------------------------------------------------
@app.post("/vectorize")
async def vectorize_face(file: UploadFile = File(...)):
    try:
        # 1. 파일 읽기
        contents = await file.read()

        # 🛠️ [수정] np.fromstring -> np.frombuffer (최신 numpy 호환)
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "FAILURE", "message": "이미지를 읽을 수 없습니다."}

        # 2. DeepFace로 벡터 추출
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL_NAME,
            enforce_detection=False  # 얼굴 감지 실패해도 진행하려면 False
        )
        vector = embedding_objs[0]["embedding"]

        return {
            "status": "SUCCESS",
            "vector": vector,
            "message": "벡터 추출 성공"
        }

    except Exception as e:
        print(f"벡터 추출 실패: {e}")
        # 500 에러 대신 JSON으로 실패 사유 반환
        return {"status": "FAILURE", "message": str(e)}

# -------------------------------------------------------------------------
# 웹 소켓 엔드포인트 (기존 유지)
# -------------------------------------------------------------------------
@app.websocket("/ws/face")
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")
    conn_db = None
    try:
        conn_db = get_db_connection()
        print("[DB] 연결 성공")
    except Exception as e:
        print(f"[DB] 연결 실패: {e}")

    try:
        await websocket.accept()
        print("[연결 수락됨]")
        current_required_ppe = ["헬멧", "조끼"] # 기본값 한글로 통일

        while True:
            data = await websocket.receive_text()
            try:
                json_data = json.loads(data)
            except json.JSONDecodeError:
                json_data = {"image": data}

            if json_data.get("type") == "CONFIG":
                current_required_ppe = json_data.get("required", [])
                print(f"[설정 변경] 검사할 보호구: {current_required_ppe}")
                continue

            image_base64 = json_data.get("image")
            if not image_base64:
                continue

            image_cv = base64_to_cv2_image(image_base64)
            if image_cv is None:
                continue

            # 얼굴 인식 및 DB 조회
            found_worker = None
            input_vector = None

            try:
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    enforce_detection=True
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception:
                pass

            if input_vector and conn_db:
                try:
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    query = """
                            SELECT
                                worker_id,
                                name,
                                department,
                                employee_number,
                                face_vector <=> %s AS distance
                            FROM
                                workers
                            ORDER BY
                                distance
                                LIMIT 1;
                            """
                    cursor.execute(query, (str(input_vector),))
                    result = cursor.fetchone()
                    cursor.close()

                    if result and result["distance"] < RECOGNITION_THRESHOLD:
                        found_worker = {
                            "worker_id": str(result["worker_id"]),
                            "name": result["name"],
                            "department": result["department"],
                            "employee_number": result["employee_number"],
                            "distance": float(result["distance"])
                        }
                    else:
                        await websocket.send_json({
                            "status": "FAILURE",
                            "message": "등록되지 않은 사용자"
                        })
                except Exception as e:
                    print(f"DB 쿼리 에러: {e}")
                    conn_db.rollback()

            if found_worker:
                ppe_result = detect_ppe_dynamic(image_cv, current_required_ppe)
                response = {
                    "status": "SUCCESS",
                    "worker": found_worker,
                    "ppe_status": ppe_result
                }
                await websocket.send_json(response)

    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")
    finally:
        if conn_db:
            conn_db.close()
            print("[DB] 연결 종료")

if __name__ == "__main__":
    import uvicorn
    # 9000번 포트 하나만 사용
    uvicorn.run(app, host="0.0.0.0", port=9000)