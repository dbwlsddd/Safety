import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

// 서버에서 받는 감지 결과에 대한 타입 정의
interface Detection {
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  label: string;
  confidence: number;
}

export function InspectionScreen() {
  // <video> 태그를 제어하기 위한 ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // 서버로부터 받은 감지 결과를 저장할 state
  const [detections, setDetections] = useState<Detection[]>([]);

  // 오류 메시지를 저장할 state
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트가 처음 로드될 때 웹캠을 켭니다.
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupWebcam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("웹캠을 시작할 수 없습니다:", err);
        setError("웹캠을 시작할 수 없습니다. 카메라 권한을 확인해주세요.");
      }
    }

    setupWebcam();

    // 컴포넌트가 사라질 때 웹캠 스트림을 정리합니다.
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []); // [] 빈 배열은 이 effect가 마운트될 때 한 번만 실행되도록 합니다.

  /**
   * '수동 검사 시작' 버튼을 눌렀을 때 실행되는 함수
   */
  const handleInspection = async () => {
    if (!videoRef.current) return;

    setError(null);
    setDetections([]);

    // 1. <video>의 현재 프레임을 <canvas>에 그립니다.
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError("캔버스 컨텍스트를 가져올 수 없습니다.");
      return;
    }
    // 웹캠은 좌우 반전(거울 모드)이므로 캔버스도 좌우 반전시켜 올바른 이미지를 캡처합니다.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // 2. 캔버스 이미지를 Base64 문자열로 변환합니다. (jpeg 형식, 품질 80%)
    // 'data:image/jpeg;base64,' 부분을 제거하고 순수 데이터만 보냅니다.
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    // 3. 'server' (localhost:8000) API로 Base64 이미지를 전송합니다.
    try {
      const response = await fetch('http://localhost:8000/detect_ppe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageBase64
        })
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.statusText}`);
      }

      const data = await response.json();

      // 4. 서버로부터 받은 감지 결과를 state에 저장합니다.
      console.log("서버 감지 결과:", data); // 결과를 콘솔에도 출력
      setDetections(data.detections || []);

    } catch (err: any) {
      console.error("API 요청 오류:", err);
      setError(`API 요청 실패: ${err.message}. 백엔드(8000번 포트) 서버가 켜져있는지 확인하세요.`);
    }
  };

  return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold mb-4">보호구 착용 검사</h1>

        {/* 웹캠 영상이 표시될 곳 */}
        <div className="relative w-full max-w-2xl border-4 border-gray-700 rounded-xl overflow-hidden shadow-lg">
          <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              // 좌우 반전 (거울 모드)
              style={{ transform: "scaleX(-1)" }}
          />
          {/* TODO: 여기에 감지된 바운딩 박스를 그릴 수 있습니다. */}
        </div>

        {/* 검사 시작 버튼 */}
        <Button
            onClick={handleInspection}
            className="mt-6 bg-blue-600 hover:bg-blue-500 text-lg font-semibold py-4 px-8 rounded-lg shadow-lg transition-all"
        >
          수동 검사 시작
        </Button>

        {/* 오류 메시지 표시 */}
        {error && (
            <div className="mt-4 p-4 bg-red-800 text-red-100 rounded-lg">
              {error}
            </div>
        )}

        {/* 감지 결과 표시 (테스트용) */}
        <div className="mt-6 w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">감지 결과 (JSON):</h2>
          <pre className="text-sm text-gray-300 overflow-auto max-h-40">
          {detections.length > 0
              ? JSON.stringify(detections, null, 2)
              : "검사 버튼을 누르면 결과가 여기에 표시됩니다."}
        </pre>
        </div>
      </div>
  );
}

// export default는 App.tsx에서 컴포넌트를 동적으로 로드하므로 여기서는 필요 없습니다.
