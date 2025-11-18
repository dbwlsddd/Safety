import os
import psycopg2
import psycopg2.extras
from deepface import DeepFace

# ---------------------------------------------------------
# 설정
# ---------------------------------------------------------
FACE_MODEL = "ArcFace"

# ⚠️ 중요: 사진 파일들이 저장된 폴더 경로를 정확히 적으세요.
# 현재 이 파일(vectorize.py)과 같은 폴더에 'images' 폴더가 있다면 "./images"
# 상위 폴더에 있다면 "../images" 입니다.
BASE_IMAGE_PATH = "./images"

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

        # 1. 벡터가 없는(NULL) 작업자만 조회 (public.workers로 수정됨)
        sql_select = """
                     SELECT worker_id, name, image_path
                     FROM public.workers
                     WHERE face_vector IS NULL AND image_path IS NOT NULL; \
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
            db_path = row['image_path'] # 예: "user1.jpg"

            # 전체 파일 경로 조합
            full_path = os.path.join(BASE_IMAGE_PATH, db_path)

            try:
                if not os.path.exists(full_path):
                    print(f"⚠️ [파일 없음] {name} ({full_path}) - 건너뜀")
                    continue

                # DeepFace 변환
                # enforce_detection=False: 얼굴이 작거나 흐려도 최대한 변환 시도
                embedding_objs = DeepFace.represent(
                    img_path=full_path,
                    model_name=FACE_MODEL,
                    enforce_detection=False
                )
                embedding = embedding_objs[0]["embedding"]

                # 3. DB 업데이트 (public.workers로 수정됨)
                sql_update = """
                             UPDATE Workers
                             SET face_vector = %s
                             WHERE worker_id = %s \
                             """
                cursor.execute(sql_update, (str(embedding), w_id))
                conn.commit()

                print(f"🆗 [성공] {name}님 변환 완료")
                success_count += 1

            except Exception as e:
                print(f"❌ [에러] {name} 처리 중 오류: {e}")
                # 오류가 나도 다음 사람으로 계속 진행

        print("-" * 50)
        print(f"🎉 전체 변환 완료: {success_count} / {len(rows)} 명")

    except Exception as e:
        print(f"🚫 치명적 DB 오류: {e}")

    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    process_missing_vectors()