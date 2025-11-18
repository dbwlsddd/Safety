import os
import psycopg2
import psycopg2.extras
from deepface import DeepFace

# ---------------------------------------------------------
# 설정
# ---------------------------------------------------------
FACE_MODEL = "ArcFace"

# 사진 파일들이 저장된 실제 서버 디렉토리 경로 (중요!)
# 예: DB에는 '/uploads/user1.jpg'라고 되어 있어도,
# 실제 파이썬이 읽을 땐 '/home/user/Safety/uploads/user1.jpg' 일 수 있음.
# 파이썬 스크립트 기준 상대경로 혹은 절대경로로 맞춰주세요.
BASE_IMAGE_PATH = "./images"  # ⬅️ 실제 사진들이 모여있는 폴더로 수정 필요

# ---------------------------------------------------------
# DB 연결
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
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    print("🔍 벡터가 없는 작업자를 검색합니다...")

    # 1. 벡터가 없는(NULL) 작업자만 조회
    # (image_path가 있는 사람만)
    sql_select = """
                 SELECT worker_id, name, image_path
                 FROM workers
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
        db_path = row['image_path'] # 예: "user_123.jpg"

        # 실제 파일 경로 조합
        # 만약 DB에 전체 경로가 있다면 BASE_IMAGE_PATH를 ""로 두세요.
        full_path = os.path.join(BASE_IMAGE_PATH, db_path)

        try:
            if not os.path.exists(full_path):
                print(f"⚠️ [실패] 파일 없음: {name} ({full_path})")
                continue

            # DeepFace 변환
            # enforce_detection=False: 사진에 얼굴이 작거나 흐려도 일단 변환 시도 (실무용 팁)
            embedding = DeepFace.represent(
                img_path=full_path,
                model_name=FACE_MODEL,
                enforce_detection=False
            )[0]["embedding"]

            # DB 업데이트
            sql_update = "UPDATE workers SET face_vector = %s WHERE worker_id = %s"
            cursor.execute(sql_update, (str(embedding), w_id))
            conn.commit()

            print(f"🆗 [성공] {name}님 등록 완료")
            success_count += 1

        except Exception as e:
            print(f"❌ [에러] {name} 처리 중 오류: {e}")

    print("-" * 50)
    print(f"🎉 변환 완료: {success_count} / {len(rows)} 명")

    conn.close()

if __name__ == "__main__":
    process_missing_vectors()