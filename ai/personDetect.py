import os
import io
import cv2
import uvicorn
import numpy as np
import base64
import psycopg2
import psycopg2.extras # 👈 딕셔너리 커서에 필요
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from deepface import DeepFace

# -------------------------------------------------------------------
# 1. 설정값 (중요)
# -------------------------------------------------------------------

# ArcFace 모델의 코사인 거리 임계값. 0.6 이하면 "동일 인물"로 판단. (조정 가능)
# (참고: L2 거리는 1.1, VGG-Face 코사인은 0.4)
RECOGNITION_THRESHOLD = 0.6

# 사용할 얼굴 인식 모델 (DB 벡터와 동일해야 함)
# DB 스키마에 'ArcFace'로 명시되어 있었음
FACE_MODEL_NAME = "ArcFace"

# -------------------------------------------------------------------
# 2. 데이터 모델 (FastAPI 요청/응답)
# -------------------------------------------------------------------

class ImageInput(BaseModel):
    """
    Java(AiProcessingServiceImpl)에서 보내는 요청 본문
    """
    image_base64: str

class WorkerResponse(BaseModel):
    """
    React(types.ts) 및 Java(WorkerDto)와 일치하는 작업자 응답
    """
    id: str
    employeeNumber: str | None # React에 필요 (DB에 추가 필요)
    name: str
    team: str | None             # (DB의 department에 해당)

class RecognitionResponse(BaseModel):
    """
    Java(WorkerRecognitionResult)와 일치하는 최종 응답
    """
    status: str  # "SUCCESS", "FAILURE", "ERROR"
    message: str | None
    worker: WorkerResponse | None

# -------------------------------------------------------------------
# 3. FastAPI 앱 및 헬퍼 함수
# -------------------------------------------------------------------

app = FastAPI()

def get_db_connection():
    """PostgreSQL DB 연결 (환경 변수 사용)"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "safety_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASS", "password"),
            port=os.getenv("DB_PORT", "5432")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"DB 연결 실패: {e}")
        raise HTTPException(status_code=500, detail="데이터베이스 연결에 실패했습니다.")

def base64_to_cv2_image(base64_str: str):
    """Base64 문자열을 OpenCV(Numpy) 이미지로 디코딩"""
    try:
        img_data = base64.b64decode(base64_str)
        img_bytes = io.BytesIO(img_data)
        img = Image.open(img_bytes)
        # DeepFace는 BGR 순서를 사용하므로 변환
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Base64 디코딩 오류: {e}")
        return None

# -------------------------------------------------------------------
# 4. 메인 인식 엔드포인트
# -------------------------------------------------------------------

@app.post("/recognize_worker",
          response_model=RecognitionResponse,
          summary="작업자 신원 인식 (DeepFace + pgvector)")
def recognize_worker_endpoint(item: ImageInput):
    """
    Java 백엔드에서 호출하는 메인 엔드포인트.
    1. Base64 이미지 디코딩
    2. DeepFace로 얼굴 벡터 추출
    3. DB의 face_vector와 코사인 거리 비교
    4. 임계값(Threshold) 이내면 작업자 정보 반환
    """

    # 1. Base64 이미지 디코딩
    image_cv = base64_to_cv2_image(item.image_base64)
    if image_cv is None:
        return RecognitionResponse(status="FAILURE", message="잘못된 이미지 형식입니다.")

    # 2. DeepFace로 얼굴 벡터 추출
    try:
        # enforce_detection=True: 이미지에서 얼굴을 감지 못하면 예외 발생
        embedding_objs = DeepFace.represent(
            img_path=image_cv,
            model_name=FACE_MODEL_NAME,
            enforce_detection=True
        )
        # DeepFace.represent는 리스트를 반환
        input_vector = embedding_objs[0]["embedding"]

    except ValueError as e:
        # "Face could not be detected" 예외가 여기에 잡힘
        print(f"얼굴 감지 실패: {e}")
        return RecognitionResponse(status="FAILURE", message="얼굴이 감지되지 않았습니다.")
    except Exception as e:
        print(f"DeepFace 벡터 추출 오류: {e}")
        return RecognitionResponse(status="ERROR", message=f"얼굴 벡터 추출 오류: {e}")

    # 3. DB에서 가장 가까운 벡터 검색 (pgvector 사용)
    conn = None
    try:
        conn = get_db_connection()
        # 딕셔너리 커서 사용 (결과를 dict로 받음)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # ❗️ 중요: DB 스키마에 employee_number가 필요합니다.
        # face_vector <=> %s : 코사인 거리(0~2)를 계산 (pgvector 연산자)
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
                    LIMIT 1; \
                """

        # pgvector에 맞게 리스트를 문자열로 변환하여 전달
        cursor.execute(query, (str(input_vector),))
        result = cursor.fetchone()

    except Exception as e:
        print(f"DB 쿼리 오류: {e}")
        raise HTTPException(status_code=500, detail=f"DB 쿼리 오류: {e}")
    finally:
        if conn:
            conn.close()

    # 4. 결과 분석 및 임계값 비교
    if result and result["distance"] < RECOGNITION_THRESHOLD:
        # 인식 성공
        worker_data = WorkerResponse(
            id=str(result["worker_id"]),
            employeeNumber=result["employee_number"], # ❗️DB에 이 컬럼이 있어야 함
            name=result["name"],
            team=result["department"] # React의 'team'에 'department' 매핑
        )
        print(f"인식 성공: {worker_data.name} (거리: {result['distance']:.4f})")
        return RecognitionResponse(
            status="SUCCESS",
            message="인식 성공",
            worker=worker_data
        )
    else:
        # 일치하는 작업자 없음
        distance = result['distance'] if result else None
        print(f"인식 실패: 일치하는 작업자 없음 (최소 거리: {distance})")
        return RecognitionResponse(status="FAILURE", message="일치하는 작업자가 없습니다.")

# -------------------------------------------------------------------
# 5. 서버 실행
# -------------------------------------------------------------------

if __name__ == "__main__":
    # Java(AiProcessingServiceImpl)의 기본 URL(localhost:8000)에 맞춤
    print("AI 인식 서버(FastAPI)를 http://0.0.0.0:8000 에서 시작합니다.")
    uvicorn.run(app, host="0.0.0.0", port=8000)