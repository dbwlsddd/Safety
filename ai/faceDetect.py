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

# -----------------------------------------------------------------
# 🛠️ [수정됨] CORS 설정
# -----------------------------------------------------------------
# "allow_origins=["*"]" 대신, 리액트 앱의 정확한 주소를 적어줍니다.
origins = [
    "https://100.64.239.86:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 🛠️ ["*"] 대신 origins 변수 사용
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
# -------------------------------------------------------------------------
@app.websocket("/ws/face") # ⬅️ "/ws/face" 경로 확인
async def websocket_endpoint(websocket: WebSocket):
    print(f"[연결 요청] {websocket.client}")

    # 🛠️ [추가] 403 오류 우회를 위해 수동으로 Origin 헤더 확인
    # (CORSMiddleware가 wss에서 완벽히 동작 안 할 경우 대비)
    origin = websocket.headers.get('origin')
    print(f"WebSocket Origin: {origin}")

    # CORSMiddleware가 이미 처리했어야 하지만,
    # Uvicorn 403 로그가 떴다는 것은 여기서 직접 처리해야 함을 의미

    try:
        # await websocket.accept() # ⬅️ 기본 accept
        # 403 에러가 났으므로, 수동으로 모든 origin을 허용하도록 accept 헤더를 보냄
        await websocket.accept(
            headers=[(b'access-control-allow-origin', b'*')]
        )
        print("[연결 수락됨]") # ⬅️ 이 로그가 뜨는지 확인
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

            try:
                embedding_objs = DeepFace.represent(
                    img_path=image_cv,
                    model_name=FACE_MODEL_NAME,
                    enforce_detection=True
                )
                input_vector = embedding_objs[0]["embedding"]
            except Exception as e:
                # print(f"얼굴 감지 실패: {e}")
                continue

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
                        "distance": float(result["distance"])
                    }

            except Exception as e:
                print(f"DB 에러: {e}")
            finally:
                if conn_db:
                    conn_db.close()

            if found_worker:
                response = {
                    "status": "SUCCESS",
                    "worker": found_worker
                }
                await websocket.send_json(response)
            else:
                pass

    except WebSocketDisconnect:
        print(f"[연결 종료] {websocket.client}")
    except Exception as e:
        print(f"[시스템 에러] {e}")

# -------------------------------------------------------------------------
# (참고) uvicorn 실행 명령어 (SSL 포함)
# -------------------------------------------------------------------------
# uvicorn main:app --host 0.0.0.0 --port 9000 --ssl-keyfile=./safety.key --ssl-certfile=./safety.crt --reload