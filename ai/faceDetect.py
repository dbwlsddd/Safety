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

# 🔥 [추가] YOLO 모델 임포트 (YOLOv11 기반이라고 가정하고 ultralytics 사용)
from ultralytics import YOLO

# FastAPI 관련 임포트
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# -----------------------------------------------------------------
# 🛠️ CORS 설정 (기존 유지)
# -----------------------------------------------------------------
origins = [
    "https://100.64.239.86:3000"
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
# 🔥 [수정] 보호구 감지 모델 경로 설정 (같은 디렉토리에 best.pt가 있다고 가정)
PPE_MODEL_PATH = "best.pt"

# -------------------------------------------------------------------------
# 🔥 보호구 감지 모델 로드 (서버 시작 시 1회)
# -------------------------------------------------------------------------
try:
    # 헬멧, 안전조끼 등을 감지하는 YOLO 모델 로드
    ppe_model = YOLO(PPE_MODEL_PATH)
    print(f"[PPE 모델 로드 성공] 경로: {PPE_MODEL_PATH}")
except Exception as e:
    print(f"[PPE 모델 로드 실패] 오류: {e}")
    ppe_model = None

# -------------------------------------------------------------------------
# DB 연결 (기존 유지)
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
# Base64 → OpenCV 이미지 변환 (기존 유지)
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
# 🔥 [추가] 보호구 감지 추론 함수
# -------------------------------------------------------------------------
def detect_ppe(cv2_image):
    """
    OpenCV 이미지에서 보호구(PPE)를 감지하고 안전 여부를 판단합니다.
    """
    # 모델 로드 실패 시 강제로 안전하지 않음 처리
    if ppe_model is None:
        print("[경고] PPE 모델이 로드되지 않아 감지 기능을 건너뜁니다.")
        return {"is_safe": False, "detections": []}

    try:
        # YOLO 추론 실행 (conf=0.5 이상만 감지)
        # 이미지는 BGR 포맷이지만 YOLO는 자동으로 변환 처리
        results = ppe_model(cv2_image, conf=0.5, verbose=False)

        detections = []

        # 감지 결과 파싱
        for r in results:
            # 바운딩 박스: [x1, y1, x2, y2]
            boxes = r.boxes.xyxy.cpu().numpy().astype(int)
            classes = r.boxes.cls.cpu().numpy().astype(int)
            names = r.names

            for box, cls_id in zip(boxes, classes):
                detections.append({
                    "box": box.tolist(),  # [x1, y1, x2, y2] 리스트
                    "label": names[cls_id],
                    "class_id": int(cls_id)
                })

        # 🛠️ 안전 로직: 헬멧(helmet)과 안전조끼(vest)가 둘 다 감지되어야 안전하다고 가정
        # 실제 모델의 클래스 이름에 맞게 조정해야 합니다.
        required_ppe = ["helmet", "vest"]
        detected_labels = {d["label"] for d in detections}

        # 모든 필수 보호구가 감지되었는지 확인
        is_safe = all(item in detected_labels for item in required_ppe)

        return {
            "is_safe": is_safe,
            "detections": detections
        }

    except Exception as e:
        print(f"보호구 감지 오류: {e}")
        return {"is_safe": False, "detections": []}

# -------------------------------------------------------------------------
# 웹 소켓 엔드포인트
# -------------------------------------------------------------------------
@app.websocket("/ws/face")
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")

    origin = websocket.headers.get('origin')
    print(f"WebSocket Origin: {origin}")

    try:
        await websocket.accept(
            headers=[(b'access-control-allow-origin', b'*')]
        )
        print("[연결 수락됨]")
    except Exception as e:
        print(f"[연결 수락 실패] {e}")
        return

    try:
        while True:
            data = await websocket.receive_text()

            try:
                json_data = json.loads(data)
                image_base64 = json_data.get("image")
            except json.JSONDecodeError:
                image_base64 = data

            if not image_base64:
                continue

            image_cv = base64_to_cv2_image(image_base64)
            if image_cv is None:
                continue

            # 1. DeepFace 얼굴 인식 및 DB 조회 (기존 로직 유지)
            found_worker = None
            input_vector = None

            try:
                # 얼굴 특징 벡터 추출
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    enforce_detection=True
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception:
                # 얼굴 감지 실패 시 vector는 None
                pass

            # DB에서 가장 가까운 작업자 찾기
            conn_db = None
            if input_vector:
                try:
                    conn_db = get_db_connection()
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    query = """
                            SELECT
                                worker_id,
                                name,
                                department,
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
                            "distance": float(result["distance"])
                        }
                except Exception as e:
                    print(f"DB 에러: {e}")
                finally:
                    if conn_db:
                        conn_db.close()

            # -------------------------------------------------------------------
            # 🔥 [핵심 수정] 작업자가 DB에서 인식된 경우에만 다음 로직 실행 및 응답 전송
            # -------------------------------------------------------------------
            if found_worker:
                # 2. 보호구 감지 실행 (인식된 경우에만 실행하여 자원 절약 및 로직 단순화)
                ppe_result = detect_ppe(image_cv)

                # 3. 결과 종합하여 클라이언트에 응답
                status = "SUCCESS"

                # 응답 JSON 구조
                response = {
                    "status": status,
                    "worker": found_worker,  # 인식 성공 시 작업자 정보
                    "ppe_status": {
                        "is_safe": ppe_result["is_safe"], # 보호구 착용 여부 (True/False)
                        "detections": ppe_result["detections"] # 감지된 보호구 목록 (박스, 라벨 등)
                    }
                }

                await websocket.send_json(response)
            else:
                # DB에 등록되지 않은 사람이거나, 사람이 없는 경우: 프론트엔드에 응답을 보내지 않고 루프를 계속함
                # 프론트엔드는 응답이 없으면 상태를 변경하지 않으므로 '인식된 사용자가 없습니다' 메시지가 뜨지 않게 됨.
                pass


    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")

# -------------------------------------------------------------------------
# (참고) uvicorn 실행 명령어 (SSL 포함)
# -------------------------------------------------------------------------
# uvicorn main:app --host 0.0.0.0 --port 9000 --ssl-keyfile=./safety.key --ssl-certfile=./safety.crt --reload