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
# 설정값 (튜닝 포인트)
# -------------------------------------------------------------------------
# 1. 임계값 조정: 0.6 -> 0.45 (더 엄격하게 검사하여 타인 인식 방지)
RECOGNITION_THRESHOLD = 0.45

# 2. 얼굴 감지 백엔드 변경: 'opencv' -> 'retinaface' 또는 'ssd'
# retinaface가 가장 정확하지만 느릴 수 있습니다. 속도가 중요하다면 'ssd' 추천.
DETECTOR_BACKEND = "ssd"

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
# 🔥 보호구 감지 추론 함수 (로깅 추가)
# -------------------------------------------------------------------------
def detect_ppe_dynamic(cv2_image, required_list):
    if ppe_model is None:
        return {"is_safe": False, "detections": []}

    # 필수 리스트가 비어있으면 무조건 통과되는 버그 방지 (최소한의 안전장치)
    if not required_list:
        print("⚠️ [경고] 필수 보호구 리스트가 비어있습니다. 검사를 건너뜁니다.")
        # 상황에 따라 True를 줄지 False를 줄지 결정해야 함. 
        # 안전이 우선이라면 False가 맞지만, 설정에 따라 다름. 일단 로그 출력.

    try:
        # conf=0.5 -> 0.6으로 약간 올려서 오탐지 방지 고려 가능
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

        # 검증 로직
        missing_items = [item for item in required_list if item not in detected_korean_labels]
        is_safe = len(missing_items) == 0

        # 🔍 디버깅 로그 출력 (콘솔에서 확인용)
        if not is_safe:
            print(f"❌ [안전 위반] 감지됨: {detected_korean_labels}, 필요: {required_list}, 누락: {missing_items}")
        else:
            print(f"✅ [안전 통과] 감지됨: {detected_korean_labels}")

        return {
            "is_safe": is_safe,
            "detections": detections,
            "missing": missing_items # 클라이언트에 누락된 항목 정보 전달 가능
        }

    except Exception as e:
        print(f"보호구 감지 오류: {e}")
        return {"is_safe": False, "detections": []}

# -------------------------------------------------------------------------
# 얼굴 벡터 추출 API (등록 시 사용)
# -------------------------------------------------------------------------
@app.post("/vectorize")
async def vectorize_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "FAILURE", "message": "이미지를 읽을 수 없습니다."}

        # 3. detector_backend 추가 (등록할 때 정확도가 제일 중요함)
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL_NAME,
            detector_backend=DETECTOR_BACKEND, # 여기서도 백엔드 일치시켜야 함
            enforce_detection=True # 등록할 땐 얼굴 없으면 에러 내는 게 맞음
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
# 웹 소켓 엔드포인트
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
        current_required_ppe = ["헬멧", "조끼"]

        while True:
            data = await websocket.receive_text()
            try:
                json_data = json.loads(data)
            except json.JSONDecodeError:
                json_data = {"image": data}

            # 설정 변경 패킷 처리
            if json_data.get("type") == "CONFIG":
                current_required_ppe = json_data.get("required", [])
                print(f"[설정 변경] 검사할 보호구 업데이트: {current_required_ppe}")
                continue

            image_base64 = json_data.get("image")
            if not image_base64:
                continue

            image_cv = base64_to_cv2_image(image_base64)
            if image_cv is None:
                continue

            # --- 얼굴 인식 로직 ---
            found_worker = None
            input_vector = None

            try:
                # 4. DeepFace 파라미터 튜닝
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    detector_backend=DETECTOR_BACKEND, # 'ssd' or 'retinaface'
                    enforce_detection=True # 얼굴이 확실히 있을 때만 처리
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception:
                # 얼굴 감지 실패 시 조용히 넘어감 (프레임마다 검사하므로)
                pass

            if input_vector and conn_db:
                try:
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)

                    # 5. SQL 쿼리 로직은 그대로 두되, Threshold를 믿음
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
                                distance ASC
                                LIMIT 1;
                            """
                    cursor.execute(query, (str(input_vector),))
                    result = cursor.fetchone()
                    cursor.close()

                    if result:
                        dist = float(result["distance"])
                        # print(f"[DEBUG] 인식된 사람: {result['name']}, 거리: {dist}") # 디버깅용 주석

                        if dist < RECOGNITION_THRESHOLD:
                            found_worker = {
                                "worker_id": str(result["worker_id"]),
                                "name": result["name"],
                                "department": result["department"],
                                "employee_number": result["employee_number"],
                                "distance": dist
                            }
                        else:
                            # 가장 가까운 사람이지만 임계값은 못 넘음 -> 타인 or 인식 실패
                            pass

                except Exception as e:
                    print(f"DB 쿼리 에러: {e}")
                    conn_db.rollback()

            # --- 응답 전송 ---
            # 얼굴을 찾았으면 보호구 검사 수행
            if found_worker:
                ppe_result = detect_ppe_dynamic(image_cv, current_required_ppe)

                # 얼굴 인식 결과와 보호구 결과를 합쳐서 전송
                response = {
                    "status": "SUCCESS",
                    "worker": found_worker,
                    "ppe_status": ppe_result
                }
                await websocket.send_json(response)

            # (옵션) 얼굴을 못 찾았을 때 클라이언트에 피드백이 필요하다면 아래 주석 해제
            # else:
            #     await websocket.send_json({"status": "NO_FACE", "message": "얼굴 감지 중..."})

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
    uvicorn.run(app, host="0.0.0.0", port=9000)