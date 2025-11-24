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

# 🔍 [핵심 수정 1] 사용자가 지정한 정확한 라벨 매핑 (대소문자 주의)
# Key: YOLO 모델이 뱉는 영어 라벨 (정확히 일치해야 함)
# Value: 프론트엔드(React)에서 사용하는 한글 라벨
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
# 🔥 보호구 감지 모델 로드 (서버 시작 시 1회)
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
# 🔥 보호구 감지 추론 함수 (매핑 로직 적용)
# -------------------------------------------------------------------------
def detect_ppe_dynamic(cv2_image, required_list):
    """
    OpenCV 이미지에서 보호구(PPE)를 감지하고,
    YOLO 라벨을 한글로 변환한 뒤 required_list와 비교합니다.
    """
    if ppe_model is None:
        return {"is_safe": False, "detections": []}

    try:
        # YOLO 추론 실행
        results = ppe_model(cv2_image, conf=0.5, verbose=False)
        detections = []
        detected_korean_labels = set()

        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy().astype(int)
            classes = r.boxes.cls.cpu().numpy().astype(int)
            names = r.names

            for box, cls_id in zip(boxes, classes):
                english_label = names[cls_id]

                # 🔍 [매핑 적용] 영어 라벨을 한글로 변환
                # 매핑 테이블에 없으면 영어 그대로 사용 (안전장치)
                korean_label = PPE_MAPPING.get(english_label, english_label)
                detected_korean_labels.add(korean_label)

                detections.append({
                    "box": box.tolist(),
                    "label": korean_label,     # 프론트엔드엔 한글 라벨 전송
                    "raw_label": english_label, # 디버깅용 원본
                    "class_id": int(cls_id)
                })

        # 설정된 리스트(required_list)에 있는 것들이 모두 감지되었는지 확인
        # 예: required_list=["헬멧", "안전조끼"] -> 감지된 셋에 둘 다 있어야 True
        is_safe = all(item in detected_korean_labels for item in required_list)

        return {
            "is_safe": is_safe,
            "detections": detections
        }

    except Exception as e:
        print(f"보호구 감지 오류: {e}")
        return {"is_safe": False, "detections": []}

# -------------------------------------------------------------------------
# 얼굴 벡터 추출 API
# -------------------------------------------------------------------------
@app.post("/vectorize")
async def vectorize_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "FAILURE", "message": "이미지를 읽을 수 없습니다."}

        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL_NAME,
            enforce_detection=True
        )
        vector = embedding_objs[0]["embedding"]

        return {
            "status": "SUCCESS",
            "vector": vector,
            "message": "벡터 추출 성공"
        }

    except Exception as e:
        print(f"벡터 추출 실패: {e}")
        return {"status": "FAILURE", "message": str(e)}

# -------------------------------------------------------------------------
# 🔥 [핵심 수정 2] 웹 소켓 엔드포인트 (DB 연결 최적화 적용됨)
# -------------------------------------------------------------------------
@app.websocket("/ws/face")
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")

    # 1. DB 연결 (루프 밖에서 1회 수행)
    conn_db = None
    try:
        conn_db = get_db_connection()
        print("[DB] 연결 성공")
    except Exception as e:
        print(f"[DB] 연결 실패: {e}")
        # DB 연결 실패해도 웹소켓은 일단 열어둠 (영상 처리는 가능하므로)

    try:
        await websocket.accept()
        print("[연결 수락됨]")

        # 기본 검사 항목 (기본값도 한글로 설정)
        current_required_ppe = ["헬멧", "안전조끼"]

        while True:
            data = await websocket.receive_text()

            try:
                json_data = json.loads(data)
            except json.JSONDecodeError:
                json_data = {"image": data}

            # 설정(CONFIG) 메시지 처리
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

            # 2. 얼굴 인식 및 DB 조회
            found_worker = None
            input_vector = None

            try:
                # 얼굴 인식
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    enforce_detection=True
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception:
                pass # 얼굴 못 찾음

            # 벡터가 있고 DB 연결이 살아있을 때만 조회
            if input_vector and conn_db:
                try:
                    # 기존 연결(conn_db) 재사용
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
                        # 얼굴은 찾았으나 등록 안 됨 -> 클라이언트에 알려줌
                        await websocket.send_json({
                            "status": "FAILURE",
                            "message": "등록되지 않은 사용자"
                        })

                except Exception as e:
                    print(f"DB 쿼리 에러: {e}")
                    conn_db.rollback() # 에러 발생 시 롤백하여 연결 유지

            # 3. 인식 여부와 관계없이 보호구 검사 결과 전송 (필요 시)
            # 현재 로직: '작업자가 인식되었을 때'만 전송
            if found_worker:
                ppe_result = detect_ppe_dynamic(image_cv, current_required_ppe)

                response = {
                    "status": "SUCCESS",
                    "worker": found_worker,
                    "ppe_status": ppe_result
                }
                await websocket.send_json(response)

            # 얼굴 못 찾은 경우(input_vector is None)는 조용히 넘어감 (다음 프레임 대기)

    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")
    finally:
        # 4. 연결 종료 시 DB 닫기
        if conn_db:
            conn_db.close()
            print("[DB] 연결 종료")