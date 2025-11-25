from flask import Flask, request, jsonify
import numpy as np
import cv2
from deepface import DeepFace
import traceback

app = Flask(__name__)

# ---------------------------------------------------------
# 설정 (vectorize.py와 동일하게 맞춤)
# ---------------------------------------------------------
FACE_MODEL = "ArcFace"

@app.route('/vectorize', methods=['POST'])
def vectorize():
    try:
        # 1. 자바 서버로부터 파일 수신
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['image']

        # 2. 이미지를 메모리에서 바로 읽기 (OpenCV 포맷으로 변환)
        # (파일로 저장하지 않고 메모리상에서 처리하므로 속도가 빠름)
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        # 3. DeepFace로 얼굴 분석 및 벡터 추출
        # img_path에 파일 경로 대신 이미지 객체(img)를 직접 넘깁니다.
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL,
            enforce_detection=False
        )

        # 결과에서 벡터만 추출
        embedding = embedding_objs[0]["embedding"]

        # 4. 결과를 JSON으로 반환 (자바 서버가 받음)
        return jsonify({'vector': embedding})

    except Exception as e:
        print("❌ 오류 발생:", str(e))
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 9000번 포트에서 서버 실행 (자바 서버가 여기로 요청을 보냄)
    print(f"🚀 AI Server running on port 9000 (Model: {FACE_MODEL})")
    app.run(host='0.0.0.0', port=9000, debug=True)