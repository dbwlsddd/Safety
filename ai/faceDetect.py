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

# -------------------------------------------------------------------------
# 🔥 보호구 감지 모델 로드 (서버 시작 시 1회)
# -------------------------------------------------------------------------
try:
    ppe_model = YOLO(PPE_MODEL_PATH)
    print(f"[PPE 모델 로드 성공] 경로: {PPE_MODEL_PATH}")
except Exception as e:
    print(f"[PPE 모델 로드 실패] 오류: {e}")
    ppe_model = None

# -------------------------------------------------------------------------
# DB 연결
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
# 🔥 [신규] 보호구 감지 추론 함수 (동적 설정 지원)
# -------------------------------------------------------------------------
def detect_ppe_dynamic(cv2_image, required_list):
    """
    OpenCV 이미지에서 보호구(PPE)를 감지하고, required_list에 있는 항목들이
    모두 착용되었는지 판단합니다.
    """
    if ppe_model is None:
        print("[경고] PPE 모델이 로드되지 않아 감지 기능을 건너뜁니다.")
        return {"is_safe": False, "detections": []}

    try:
        # YOLO 추론 실행
        results = ppe_model(cv2_image, conf=0.5, verbose=False)
        detections = []

        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy().astype(int)
            classes = r.boxes.cls.cpu().numpy().astype(int)
            names = r.names

            for box, cls_id in zip(boxes, classes):
                detections.append({
                    "box": box.tolist(),
                    "label": names[cls_id],
                    "class_id": int(cls_id)
                })

        detected_labels = {d["label"] for d in detections}

        # 설정된 리스트(required_list)에 있는 것들이 모두 감지되었는지 확인
        is_safe = all(item in detected_labels for item in required_list)

        return {
            "is_safe": is_safe,
            "detections": detections
        }

    except Exception as e:
        print(f"보호구 감지 오류: {e}")
        return {"is_safe": False, "detections": []}

# -------------------------------------------------------------------------
# 🔥 [신규] 얼굴 벡터 추출 API (Spring Boot 연동용)
# -------------------------------------------------------------------------
@app.post("/vectorize")
async def vectorize_face(file: UploadFile = File(...)):
    """
    이미지 파일을 업로드 받아 얼굴 특징 벡터(embedding)를 반환합니다.
    작업자 등록 시 사용됩니다.
    """
    try:
        # 1. 파일 읽기
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "FAILURE", "message": "이미지를 읽을 수 없습니다."}

        # 2. DeepFace로 벡터 추출
        # enforce_detection=True로 하면 얼굴을 못 찾을 때 예외 발생
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL_NAME,
            enforce_detection=True
        )

        # 첫 번째 얼굴의 벡터 반환
        vector = embedding_objs[0]["embedding"]

        return {
            "status": "SUCCESS",
            "vector": vector,
            "message": "벡터 추출 성공"
        }

    except Exception as e:
        print(f"벡터 추출 실패: {e}")
        # 얼굴을 못 찾았거나 기타 오류 시
        return {"status": "FAILURE", "message": str(e)}

# -------------------------------------------------------------------------
# 웹 소켓 엔드포인트
# -------------------------------------------------------------------------
@app.websocket("/ws/face")
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")

    try:
        await websocket.accept(
            headers=[(b'access-control-allow-origin', b'*')]
        )
        print("[연결 수락됨]")
    except Exception as e:
        print(f"[연결 수락 실패] {e}")
        return

    # 🛠️ 기본 검사 항목 (클라이언트가 설정을 보내기 전까지 사용)
    current_required_ppe = ["helmet", "vest"]

    try:
        while True:
            data = await websocket.receive_text()

            try:
                json_data = json.loads(data)
            except json.JSONDecodeError:
                # JSON이 아니면 단순 base64 문자열로 가정 (하위 호환)
                json_data = {"image": data}

            # 1. 🛠️ 설정(CONFIG) 메시지 처리
            if json_data.get("type") == "CONFIG":
                current_required_ppe = json_data.get("required", [])
                print(f"[설정 변경] 검사할 보호구: {current_required_ppe}")
                continue # 설정만 바꾸고 다음 루프로

            image_base64 = json_data.get("image")
            if not image_base64:
                continue

            image_cv = base64_to_cv2_image(image_base64)
            if image_cv is None:
                continue

            # 2. DeepFace 얼굴 인식 및 DB 조회
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

            if input_vector:
                conn_db = None
                try:
                    conn_db = get_db_connection()
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

                    if result and result["distance"] < RECOGNITION_THRESHOLD:
                        found_worker = {
                            "worker_id": str(result["worker_id"]),
                            "name": result["name"],
                            "department": result["department"],
                            "employee_number": result["employee_number"],
                            "distance": float(result["distance"])
                        }
                except Exception as e:
                    print(f"DB 에러: {e}")
                finally:
                    if conn_db:
                        conn_db.close()

            # 3. 인식된 경우에만 보호구 검사 및 응답
            if found_worker:
                # 🛠️ 동적 설정값(current_required_ppe)을 사용하여 검사
                ppe_result = detect_ppe_dynamic(image_cv, current_required_ppe)

                response = {
                    "status": "SUCCESS",
                    "worker": found_worker,
                    "ppe_status": ppe_result
                }

                await websocket.send_json(response)
            else:
                pass

    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")

# uvicorn 실행: uvicorn faceDetect:app --host 0.0.0.0 --port 9000 --reload