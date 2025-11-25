import os
import psycopg2
import psycopg2.extras
from deepface import DeepFace
import numpy as np
import cv2

# ---------------------------------------------------------
# 설정
# ---------------------------------------------------------
FACE_MODEL = "ArcFace"

# ⚠️ [체크] 실제 이미지가 저장된 경로로 수정하세요!
# (서버 루트에서 실행한다면 "uploads/images", ai 폴더면 "../uploads/images" 등)
BASE_IMAGE_PATH = "../images"

# ---------------------------------------------------------
# DB 연결 정보
# ---------------------------------------------------------
def get_db():
    return psycopg2.connect(
        host="100.64.239.86",
        database="safety_db",
        user="safety_admin",
        password="jiji0424",
        port="5432"
    )

def process_missing_vectors():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        print("🔍 벡터가 없는 작업자를 검색합니다...")

        # 1. 대상 조회
        sql_select = """
                     SELECT worker_id, name, image_path
                     FROM public.workers
                     WHERE face_vector IS NULL AND image_path IS NOT NULL;
                     """
        cursor.execute(sql_select)
        rows = cursor.fetchall()

        if not rows:
            print("✅ 모든 작업자의 벡터가 이미 생성되어 있습니다.")
            return

        print(f"총 {len(rows)}명의 미등록 작업자를 찾았습니다. 변환을 시작합니다.")
        print("-" * 50)

        success_count = 0

        for row in rows:
            w_id = row['worker_id']
            name = row['name']
            # DB에 저장된 경로 (예: /uploads/images/filename.jpg)
            db_path = row['image_path']

            # 🛠️ [수정] DB 경로가 이미 절대경로/상대경로를 포함하고 있을 수 있으므로 조정
            # 만약 db_path가 "/uploads/..." 로 시작하면 앞의 슬래시 제거 후 결합
            clean_db_path = db_path.lstrip("/") if db_path else ""

            # 전체 파일 경로 조합 (BASE_IMAGE_PATH가 필요 없다면 clean_db_path만 사용)
            # 환경에 따라 유연하게 처리:
            if os.path.exists(clean_db_path):
                full_path = clean_db_path
            else:
                full_path = os.path.join(BASE_IMAGE_PATH, os.path.basename(db_path))

            try:
                if not os.path.exists(full_path):
                    print(f"⚠️ [파일 없음] {name} ({full_path}) - 경로 확인 필요")
                    continue

                # 이미지 읽기 (한글 경로 대응)
                try:
                    img_array = np.fromfile(full_path, np.uint8)
                    img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                except Exception as e:
                    print(f"⚠️ [이미지 로딩 실패] {name}: {e}")
                    continue

                if img_cv is None:
                    print(f"⚠️ [이미지 디코딩 실패] {name} ({full_path})")
                    continue

                # DeepFace 변환
                embedding_objs = DeepFace.represent(
                    img_path=img_cv,
                    model_name=FACE_MODEL,
                    enforce_detection=False
                )
                embedding = embedding_objs[0]["embedding"]

                # 3. DB 업데이트
                sql_update = """
                             UPDATE public.workers
                             SET face_vector = %s
                             WHERE worker_id = %s
                             """

                # 🛠️ [핵심 수정] 리스트를 문자열로 변환하여 전달 (pgvector 포맷 대응)
                cursor.execute(sql_update, (str(embedding), w_id))
                conn.commit()

                print(f"🆗 [성공] {name}님 변환 완료")
                success_count += 1

            except Exception as e:
                print(f"❌ [에러] {name} 처리 중 오류: {e}")
                conn.rollback()

        print("-" * 50)
        print(f"🎉 전체 변환 완료: {success_count} / {len(rows)} 명")

    except Exception as e:
        print(f"🚫 치명적 DB 오류: {e}")

    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # 필수 라이브러리 설치 안내
    # pip install psycopg2-binary deepface numpy opencv-python
    process_missing_vectors()