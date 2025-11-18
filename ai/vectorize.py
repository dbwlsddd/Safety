import os
import psycopg2
import psycopg2.extras
from deepface import DeepFace
import numpy as np  # ⬅️ [필수] 한글 경로 처리를 위해 추가
import cv2          # ⬅️ [필수] 한글 경로 처리를 위해 추가

# ---------------------------------------------------------
# 설정
# ---------------------------------------------------------
FACE_MODEL = "ArcFace"

# ⚠️ 중요: 사진 파일들이 저장된 폴더 경로
# 예: 현재 폴더 상위에 images 폴더가 있다면 "../images"
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

        # 1. public.workers 테이블 조회
        # (이미지 경로는 있지만 벡터가 NULL인 사람만)
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

        # 2. 한 명씩 순회하며 변환
        for row in rows:
            w_id = row['worker_id']
            name = row['name']
            db_path = row['image_path'] # 예: "이유진.png"

            # 전체 파일 경로 조합
            full_path = os.path.join(BASE_IMAGE_PATH, db_path)

            try:
                if not os.path.exists(full_path):
                    print(f"⚠️ [파일 없음] {name} ({full_path}) - 건너뜀")
                    continue

                # --- 🛠️ [핵심 수정] 한글 경로 이미지 읽기 ---
                # 파이썬의 open()이나 cv2.imread()는 한글 경로를 잘 못 읽습니다.
                # numpy로 파일을 바이너리로 읽은 뒤, cv2로 디코딩해야 합니다.
                try:
                    img_array = np.fromfile(full_path, np.uint8)
                    img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                except Exception as e:
                    print(f"⚠️ [이미지 로딩 실패] {name}: {e}")
                    continue

                if img_cv is None:
                    print(f"⚠️ [이미지 디코딩 실패] {name} ({full_path})")
                    continue
                # ---------------------------------------------

                # DeepFace 변환
                # img_path에 경로 대신 읽어온 이미지 데이터(img_cv)를 넘깁니다.
                embedding_objs = DeepFace.represent(
                    img_path=img_cv,
                    model_name=FACE_MODEL,
                    enforce_detection=False
                )
                embedding = embedding_objs[0]["embedding"] # 파이썬 리스트 [0.1, 0.2, ...]

                # 3. DB 업데이트 (public.workers)
                sql_update = """
                             UPDATE public.workers
                             SET face_vector = %s
                             WHERE worker_id = %s
                             """

                # 🛠️ pgvector는 파이썬 리스트를 그대로 받습니다 (str 변환 X)
                cursor.execute(sql_update, (embedding, w_id))
                conn.commit()

                print(f"🆗 [성공] {name}님 변환 완료")
                success_count += 1

            except Exception as e:
                print(f"❌ [에러] {name} 처리 중 오류: {e}")
                conn.rollback() # 오류 발생 시 해당 트랜잭션 취소

        print("-" * 50)
        print(f"🎉 전체 변환 완료: {success_count} / {len(rows)} 명")

    except Exception as e:
        print(f"🚫 치명적 DB 오류: {e}")

    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    process_missing_vectors()