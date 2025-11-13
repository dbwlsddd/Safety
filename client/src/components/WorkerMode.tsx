import { useState, useRef, useEffect } from 'react';
import { Camera, LogIn, LogOut, ChevronLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Screen } from '../App';

// ==================================================================
// [ 1. 설정 ] 웹소켓 주소 및 프레임 전송 간격
// ==================================================================
// TODO:
// "jjserver"의 IP 주소와 Spring Boot 포트(e.g., 8080)로 변경해야 합니다.
// 예: "ws://100.64.239.86:8080/ws/video"
const WEBSOCKET_URL = "ws://100.64.239.86:8080/ws/video";

// 10프레임/초 (30fps 기준 1/3) 와 유사하게, 300ms(0.3초)마다 프레임 전송
// (카톡 태스크: "10프레임당 하나씩")
const FRAME_CAPTURE_INTERVAL_MS = 300;
// ==================================================================

// Mock Worker (시뮬레이션용) - 이제 백엔드에서 받아옵니다.
// const SIMULATED_WORKER = { id: "1", name: "홍길동 (A팀)" };

interface WorkerModeProps {
  onNavigate: (screen: Screen) => void;
  // TODO: App.tsx에서 '검사 통과 여부'와 '인식된 작업자' 상태를 받아와야 함
  // isPpeChecked: boolean;
  // setRecognizedWorker: (worker: {id: string, name: string} | null) => void;
}

export function WorkerMode({ onNavigate }: WorkerModeProps) {
  // 얼굴 인식 상태
  const [recognizedWorker, setRecognizedWorker] = useState<{ id: string, name: string } | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(true); // 현재 인식 중인지
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [wsConnectionError, setWsConnectionError] = useState<string | null>(null);

  // 보호구 검사 통과 여부 (임시)
  const isPpeChecked_TEMP = false; // TODO: 이 상태는 App.tsx의 props에서 받아와야 함

  const videoRef = useRef<HTMLVideoElement>(null);

  // ==================================================================
  // [ 2. Ref 추가 ] 웹소켓, 캔버스, 인터벌을 관리하기 위한 Ref
  // ==================================================================
  const webSocketRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // 프레임 캡처용 (보이지 않음)
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // 프레임 전송 인터벌 ID
  // ==================================================================


  // 1. 컴포넌트 마운트 시 웹캠 켜기 및 웹소켓 연결
  useEffect(() => {
    let stream: MediaStream;

    // [ 3. 프레임 캡처 및 전송 함수 ]
    const captureAndSendFrame = () => {
      // 비디오, 캔버스, 웹소켓이 모두 준비되었는지 확인
      if (
          videoRef.current &&
          canvasRef.current &&
          webSocketRef.current &&
          webSocketRef.current.readyState === WebSocket.OPEN
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // 비디오 크기에 맞게 캔버스 크기 설정 (매번 할 필요는 없지만, 안정성을 위해)
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // 캔버스에 현재 비디오 프레임을 그림
          // (거울 모드이므로, 캔버스에서 다시 좌우 반전해서 원본을 보냄)
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.setTransform(1, 0, 0, 1, 0, 0); // (중요) 다음 프레임을 위해 변환 리셋

          // 캔버스 이미지를 JPEG Blob (바이너리 데이터)으로 변환
          canvas.toBlob(
              (blob) => {
                if (blob && webSocketRef.current?.readyState === WebSocket.OPEN) {
                  // Blob 데이터를 웹소켓을 통해 백엔드(스프링부트)로 전송
                  webSocketRef.current.send(blob);
                }
              },
              'image/jpeg',
              0.8 // 이미지 품질 (0.8 = 80%)
          );
        }
      }
    };

    // [ 4. 웹소켓 연결 함수 ]
    const startWebSocket = () => {
      // 캔버스(Off-screen) 생성
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      console.log(`AI 서버 연결 시도: ${WEBSOCKET_URL}`);
      const ws = new WebSocket(WEBSOCKET_URL);
      webSocketRef.current = ws;

      ws.onopen = () => {
        console.log("AI 서버 연결 성공.");
        setWsConnectionError(null);
        setIsRecognizing(true);
        // (카톡 태스크) 연결 성공 시, 일정 간격으로 프레임 전송 시작
        intervalRef.current = setInterval(captureAndSendFrame, FRAME_CAPTURE_INTERVAL_MS);
      };

      // (카톡 태스크) 백엔드(YOLO)로부터 응답(사람 인식 결과)을 받았을 때
      ws.onmessage = (event) => {
        // TODO: 백엔드(스프링부트->YOLO)가 보내주는 JSON 형식에 맞춰 수정 필요
        // (임시) {"status": "SUCCESS", "worker": {"id": "1", "name": "홍길동 (A팀)"}}
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'SUCCESS' && data.worker) {
            console.log("인식 성공:", data.worker.name);
            setRecognizedWorker(data.worker);
            setIsRecognizing(false);

            // (중요) 얼굴 인식이 성공했으므로, 더 이상 프레임 전송 중지
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            ws.close(); // 연결 목적 달성
          }
          // else if (data.status === 'NOT_FOUND') { ... }
          // else if (data.status === 'PROCESSING') { ... }

        } catch (err) {
          console.error("백엔드 메시지 파싱 오류:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("웹소켓 오류:", err);
        setWsConnectionError("AI 서버 연결에 실패했습니다. (주소 확인)");
        setIsRecognizing(false);
      };

      ws.onclose = () => {
        console.log("AI 서버 연결 끊김.");
        // (중요) 연결이 끊기면, 프레임 전송 인터벌도 중지
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    };


    // [ 5. 웹캠 시작 함수 (기존) ]
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }, // 전면 카메라
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // (중요) 비디오가 로드된 *후에* 웹소켓 연결 시작
          videoRef.current.onloadeddata = () => {
            startWebSocket(); // <--- 웹캠이 켜지면 웹소켓 연결 시작
          };
        }
      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setWebcamError("웹캠을 켤 수 없습니다. 카메라 권한을 확인해주세요.");
        setIsRecognizing(false);
      }
    };

    startWebcam(); // (A)

    // (시뮬레이션 타이머 삭제)

    // 3. 컴포넌트 언마운트 시 모든 리소스 정리
    return () => {
      console.log("WorkerMode 정리...");
      // (1) 인터벌 중지
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // (2) 웹소켓 연결 종료
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      // (3) 웹캠 스트림 중지
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };

  }, []); // <--- 이 부분은 빈 배열로 유지 (딱 한 번만 실행)

  // '보호구 검사 시작' 버튼 클릭 시
  const handlePpeCheck = () => {
    // 인식된 작업자 정보를 가지고 검사 화면으로 이동
    // TODO: recognizedWorker 정보를 onNavigate를 통해 App.tsx로 전달해야 함
    onNavigate("inspection");
  };

  // ==================================================================
  // [ 6. UI 렌더링 ] (DButton, mode-selection 오타 수정 완료)
  // ==================================================================
  return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 md:p-8">
        <Button
            variant="ghost"
            className="absolute top-6 left-6 text-gray-400 hover:text-white"
            onClick={() => onNavigate("mode-selection")} // [오류 수정] 's' 소문자
        >
          <ChevronLeft className="w-6 h-6 mr-1" />
          모드 선택
        </Button>

        <Card className="w-full max-w-lg bg-gray-800 border-gray-700 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">
              본인 확인 (1/2 단계)
            </CardTitle>
            <CardDescription className="text-lg text-gray-400 pt-2">
              웹캠에 얼굴을 인식시켜 본인 확인을 완료하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-8">

            {/* 얼굴 인식 웹캠 UI */}
            <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
              <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100" // 거울 모드
              />

              {/* 얼굴 가이드라인 및 상태 오버레이 */}
              <div className="absolute inset-0 flex flex-col justify-center items-center p-4">
                {/* 타원형 가이드라인 */}
                <div
                    className={`w-3/4 h-3/4 border-4 rounded-[50%] transition-colors duration-500 
                ${isRecognizing ? 'border-dashed border-yellow-500' : 'border-solid border-green-500'}`}
                ></div>

                {/* 상태 메시지 */}
                <div className="absolute bottom-4 bg-black bg-opacity-50 px-4 py-2 rounded-lg text-white text-lg font-medium">
                  {webcamError ? (
                      <span className="text-red-500">{webcamError}</span>
                  ) : wsConnectionError ? ( // 웹소켓 연결 오류 메시지 추가
                      <span className="text-red-500">{wsConnectionError}</span>
                  ) : isRecognizing ? (
                      <span className="flex items-center text-yellow-400">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    얼굴 스캔 중...
                  </span>
                  ) : (
                      <span className="text-green-400">
                    ✅ {recognizedWorker?.name} 님, 확인되었습니다.
                  </span>
                  )}
                </div>
              </div>
            </div>

            {/* v6 기획안: 핵심 액션 버튼 (검사 시작) */}
            <Button
                onClick={handlePpeCheck}
                disabled={!recognizedWorker} // 얼굴 인식이 완료되어야 활성화
                className="w-full text-lg py-7 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              보호구 검사 시작 (2단계)
            </Button> {/* [오류 수정] 'B'utton */}

            {/* 출입 및 퇴근 버튼 */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                  disabled={!isPpeChecked_TEMP} // 2단계 검사 통과 시 활성화
                  className="w-full text-md py-6 bg-gray-600 hover:bg-gray-500"
                  size="lg"
                  variant="secondary"
              >
                <LogIn className="w-5 h-5 mr-2" />
                출입 기록
              </Button>

              <Button
                  className="w-full text-md py-6 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  size="lg"
                  variant="outline"
              >
                <LogOut className="w-5 h-5 mr-2" />
                퇴근 기록
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
  );
}