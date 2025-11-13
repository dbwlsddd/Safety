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
const FRAME_CAPTURE_INTERVAL_MS = 300;
// ==================================================================

interface WorkerModeProps {
  onBack: () => void; // 모드 선택 화면으로 돌아가는 함수 (App.tsx에서 handleLogout 연결)
  // TODO: App.tsx에서 '검사 통과 여부'와 '인식된 작업자' 상태를 받아와야 함
  // isPpeChecked: boolean;
  // setRecognizedWorker: (worker: {id: string, name: string} | null) => void;
}

// 수정된 WorkerMode 컴포넌트
export function WorkerMode({ onBack }: WorkerModeProps) {
  // 얼굴 인식 상태
  const [recognizedWorker, setRecognizedWorker] = useState<{ id: string, name: string } | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [wsConnectionError, setWsConnectionError] = useState<string | null>(null);
  const isPpeChecked_TEMP = false;
  const [step, setStep] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 컴포넌트 마운트 시 웹캠 켜기 및 웹소켓 연결
  useEffect(() => {
    let stream: MediaStream | undefined;

    // [ 3. 프레임 캡처 및 전송 함수 ]
    const captureAndSendFrame = () => {
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
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          canvas.toBlob(
              (blob) => {
                if (blob && webSocketRef.current?.readyState === WebSocket.OPEN) {
                  webSocketRef.current.send(blob);
                }
              },
              'image/jpeg',
              0.8
          );
        }
      }
    };

    // [ 4. 웹소켓 연결 함수 ]
    const startWebSocket = () => {
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
        intervalRef.current = setInterval(captureAndSendFrame, FRAME_CAPTURE_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'SUCCESS' && data.worker) {
            console.log("인식 성공:", data.worker.name);
            setRecognizedWorker(data.worker);
            setIsRecognizing(false);

            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            ws.close();
          }
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
          video: { facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            startWebSocket();
          };
        }
      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setWebcamError("웹캠을 켤 수 없습니다. 카메라 권한을 확인해주세요.");
        setIsRecognizing(false);
      }
    };

    startWebcam();

    // 3. 컴포넌트 언마운트 시 모든 리소스 정리
    return () => {
      console.log("WorkerMode 정리...");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };

  }, []);

  // '보호구 검사 시작' 버튼 클릭 시
  const handlePpeCheck = () => {
    // onNavigate("inspection"); // App.tsx의 Screen 타입에 맞게 수정 필요
    console.log("보호구 검사 시작 (App.tsx의 inspection 화면으로 이동 예정)");
  };

  // 헤더 컴포넌트
  const Header = () => (
      // flex-shrink-0: 헤더 높이 고정
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        {/* 왼쪽에 [모드 선택] 버튼 */}
        <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white hover:bg-slate-800/50 p-2 h-auto rounded-full text-sm"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          모드 선택
        </Button>

        {/* 가운데에 본인확인 (1/2 단계) 텍스트 */}
        <h1 className="text-lg font-semibold text-white absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          본인확인 ({step}/2 단계)
        </h1>

        <div className="w-20"></div>
      </header>
  );

  return (
      // 1. 전체 레이아웃 (세로 Flex): 스크롤 없이 모든 요소를 담기 위해 h-screen
      <div className="flex flex-col h-screen bg-slate-950">

        <Header />

        {/* 2. 메인 컨텐츠 영역: 남은 높이를 모두 채우고, 가로로 요소를 배치 (flex-grow + flex-row) */}
        {/* items-stretch: 자식 요소를 세로로 최대한 늘립니다. */}
        <main className="flex-grow flex flex-row items-stretch justify-center p-4 md:p-8 space-x-4 overflow-hidden">

          {/* 2-1. 웹캠 영역 (유연한 너비) */}
          {/* flex-grow: 남은 너비를 채우고, min-w-0: 스크롤 방지 핵심! */}
          <Card className="flex-grow flex flex-col min-w-0 bg-slate-900 border-slate-800 shadow-2xl shadow-cyan-500/10">

            <CardHeader className="text-center pb-2 flex-shrink-0">
              <CardTitle className="text-2xl font-bold text-white">
                웹캠으로 얼굴 인식
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                전신 또는 상반신이 잘 보이도록 조정해주세요.
              </CardDescription>
            </CardHeader>

            {/* 웹캠 비디오 영역 컨테이너: h-full을 사용하여 남은 높이를 모두 채우게 함 */}
            <CardContent className="flex-grow flex justify-center items-center p-4 pt-0">
              <div className="relative h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow-inner"
                  // 웹캠 비디오 비율을 3:4 (세로)로 강제하여 전신 인식에 적합하도록 함
                   style={{ aspectRatio: '3 / 4' }}
              >
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
                    ) : wsConnectionError ? (
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
            </CardContent>
          </Card>

          {/* 2-2. 버튼/컨트롤 영역 (고정 너비) */}
          {/* w-80 (약 320px) 너비 고정, flex-shrink-0: 너비 줄어들지 않음 */}
          <Card className="flex-shrink-0 w-80 bg-slate-900 border-slate-800 shadow-2xl shadow-cyan-500/10 flex flex-col justify-between p-4 space-y-4">

            <div className="flex-grow flex flex-col justify-center space-y-4">
              {/* 핵심 액션 버튼 (검사 시작) */}
              <Button
                  onClick={handlePpeCheck}
                  disabled={!recognizedWorker} // 얼굴 인식이 완료되어야 활성화
                  className="w-full text-lg py-7 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold shadow-lg shadow-cyan-500/30 rounded-xl flex-shrink-0"
                  size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                보호구 검사 시작 (2단계)
              </Button>
            </div>

            {/* 출입 및 퇴근 버튼 (하단 고정) */}
            <div className="grid grid-cols-2 gap-3 pt-4 flex-shrink-0">
              <Button
                  disabled={!isPpeChecked_TEMP} // 2단계 검사 통과 시 활성화
                  className="w-full text-md py-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold shadow-md shadow-cyan-500/10 rounded-xl"
                  size="lg"
                  variant="secondary"
              >
                <LogIn className="w-5 h-5 mr-2" />
                출입 기록
              </Button>

              <Button
                  className="w-full text-md py-6 border-cyan-500/50 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 font-semibold rounded-xl"
                  size="lg"
                  variant="outline"
              >
                <LogOut className="w-5 h-5 mr-2" />
                퇴근 기록
              </Button>
            </div>
          </Card>
        </main>
      </div>
  );
}