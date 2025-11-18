import socket
import threading
import base64
import io
import os
import cv2
import numpy as np
from PIL import Image
import psycopg2
import psycopg2.extras
from deepface import DeepFace
import json

# -------------------------------------------------------------------------
# 설정값
# 0.0.0.0 => 모든 네트워크 접속 허용
# 포트는 9000번. 따라서 <서버IP>:9000 입력 시 소켓 접속 가능
# 페이스 모델은 지니가 쓴 거 아무거나 지정
# -------------------------------------------------------------------------
HOST = '0.0.0.0'
PORT = 9000
RECOGNITION_THRESHOLD = 0.6
FACE_MODEL_NAME = "ArcFace"

# -------------------------------------------------------------------------
# DB 연결
# 연결 정보는 서버의 /home/user/pg/docker-compose.yaml 참고
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
# Base64 → OpenCV 이미지
# -------------------------------------------------------------------------
def base64_to_cv2_image(base64_str):
    try:
        img_data = base64.b64decode(base64_str)
        img_bytes = io.BytesIO(img_data)
        img = Image.open(img_bytes)
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Base64 디코딩 오류: {e}")
        return None

# -------------------------------------------------------------------------
# 클라이언트 처리
# 이 함수가 while True: 라서 프로그램이 끝나지 않는 것
# -------------------------------------------------------------------------
def handle_client(conn, addr):
    print(f"[연결됨] {addr}")
    with conn:
        while True:
            try:
                # 먼저 길이 읽기 (이미지 데이터 길이)
                length_bytes = conn.recv(8)
                if not length_bytes:
                    break
                length = int.from_bytes(length_bytes, 'big')

                # 이미지 데이터 수신
                data = b''
                while len(data) < length:
                    packet = conn.recv(length - len(data))
                    if not packet:
                        break
                    data += packet
                if not data:
                    break

                # Base64 디코딩
                image_cv = base64_to_cv2_image(data.decode('utf-8'))
                if image_cv is None:
                    continue  # 얼굴 없으면 아무 반환 없이 계속

                # DeepFace 벡터 추출
                try:
                    embedding_objs = DeepFace.represent(
                        img_path=image_cv,
                        model_name=FACE_MODEL_NAME,
                        enforce_detection=True
                    )
                    input_vector = embedding_objs[0]["embedding"]
                except Exception as e:
                    print(f"얼굴 벡터 추출 실패: {e}")
                    continue  # 얼굴 없으면 루프 계속

                # DB 검색
                try:
                    conn_db = get_db_connection()
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    query = """
                        SELECT 
                            worker_id, 
                            name, 
                            department,
                            face_vector <=> %s AS distance,
                            image_path,
                            created_at
                        FROM 
                            workers
                        ORDER BY 
                            distance
                        LIMIT 1;
                    """
                    cursor.execute(query, (str(input_vector),))
                    result = cursor.fetchone()
                except Exception as e:
                    print(f"DB 오류: {e}")
                    continue
                finally:
                    if conn_db:
                        conn_db.close()

                # 임계값 비교
                if result and result["distance"] < RECOGNITION_THRESHOLD:
                    response = {
                        "status": "SUCCESS",
                        "worker": {
                            "worker_id": str(result["worker_id"]),
                            "name": result["name"],
                            "department": result["department"]
                        }
                    }
                    conn.sendall(json.dumps(response).encode('utf-8'))
                else:
                    # 얼굴은 감지됐지만 일치하는 작업자 없음 → 아무 반환 없음
                    continue

            except Exception as e:
                print(f"[에러] {e}")
                break
    print(f"[연결 종료] {addr}")

# -------------------------------------------------------------------------
# 메인 서버
# -------------------------------------------------------------------------
def start_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, PORT))
        s.listen()
        print(f"[서버 시작] {HOST}:{PORT}")
        while True:
            conn, addr = s.accept()
            thread = threading.Thread(target=handle_client, args=(conn, addr))
            thread.start()


# -------------------------------------------------------------------------
# 이 py 파일의 시작 부분
# pyenv activate face 이후 python faceDetect.py 입력할 때의 최초 진입점
# -------------------------------------------------------------------------
if __name__ == "__main__":
    start_server()