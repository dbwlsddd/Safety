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

# FastAPI 관련 임포트
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 설정 (리액트 포트 3000번 등에서의 접근 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 ["http://localhost:3000"] 처럼 특정 도메인만 허용 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# 설정값
# -------------------------------------------------------------------------
RECOGNITION_THRESHOLD = 0.6
FACE_MODEL_NAME = "ArcFace"

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
        # 리액트에서 "data:image/jpeg;base64," 헤더가 붙어올 경우 제거
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
# 웹 소켓 엔드포인트
# 리액트 주소: ws://서버IP:8000/ws
# -------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")
    await websocket.accept() # 연결 수락

    try:
        while True:
            # 1. 리액트로부터 데이터 수신 (JSON 문자열 가정)
            # 예: { "image": "base64문자열..." }
            data = await websocket.receive_text()

            try:
                json_data = json.loads(data)
                image_base64 = json_data.get("image")
            except json.JSONDecodeError:
                # JSON이 아니라 그냥 base64 문자열만 보냈을 경우 대비
                image_base64 = data

            if not image_base64:
                continue

            # 2. 이미지 변환
            image_cv = base64_to_cv2_image(image_base64)
            if image_cv is None:
                continue

            # 3. DeepFace 분석 (동기 함수이므로 주의, 실제 운영시 비동기 처리 권장)
            try:
                # DeepFace는 무거워서 여기서 잠깐 멈칫할 수 있음
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    enforce_detection=True
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception as e:
                # 얼굴 감지 실패 시 조용히 넘어감 (또는 에러 메시지 전송)
                # print(f"얼굴 감지 실패: {e}")
                continue

            # 4. DB 검색
            found_worker = None
            conn_db = None
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
                            LIMIT 1; \
                        """
                cursor.execute(query, (str(input_vector),))
                result = cursor.fetchone()

                if result and result["distance"] < RECOGNITION_THRESHOLD:
                    found_worker = {
                        "worker_id": str(result["worker_id"]),
                        "name": result["name"],
                        "department": result["department"],
                        "distance": float(result["distance"]) # float 변환 필요
                    }

            except Exception as e:
                print(f"DB 에러: {e}")
            finally:
                if conn_db:
                    conn_db.close()

            # 5. 결과 전송 (찾았을 때만 보냄)
            if found_worker:
                response = {
                    "status": "SUCCESS",
                    "worker": found_worker
                }
                await websocket.send_json(response)
            else:
                # 못 찾았을 때도 알려주고 싶으면 아래 주석 해제
                # await websocket.send_json({"status": "FAIL"})
                pass

    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")