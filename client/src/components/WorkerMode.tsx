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
import { Separator } from '@/components/ui/separator';
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
  // 상태 관리 (기존 로직 유지)
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

  // 1. 컴포넌트 마운트 시 웹캠 켜기 및 웹소켓 연결 (로직 유지)
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
    console.log("보호구 검사 시작 (inspection 화면으로 이동 예정)");
    // TODO: onNavigate("inspection") 로직을 여기서 실행해야 함
  };

  // '출입 기록' 버튼 클릭 시
  const handleCheckIn = () => {
    console.log("출입 기록");
    // TODO: onCheckIn 로직 실행
  };

  // '퇴근 기록' 버튼 클릭 시
  const handleCheckOut = () => {
    console.log("퇴근 기록");
    // TODO: onCheckOut 로직 실행
  };

  // 헤더 컴포넌트
  const Header = () => (
      // relative 추가: h1의 absolute 기준점 제공
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 relative">

        {/* 1. 왼쪽 영역 (모드 선택 버튼) */}
        <div className="flex-shrink-0">
          <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-400 hover:text-white hover:bg-slate-800/50 p-2 h-auto rounded-full text-sm"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            모드 선택
          </Button>
        </div>

        {/* 2. 중앙 영역 (단계 텍스트): absolute로 헤더 전체 중앙에 배치 */}
        <h1 className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-white whitespace-nowrap">
          {step === 1 ? '얼굴 인식' : '보호구 검사'} ({step}/2 단계)
        </h1>

        {/* 3. 오른쪽 영역 (모든 액션 버튼 통합) */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* 보호구 검사 시작 */}
          <Button
              onClick={handlePpeCheck}
              disabled={!recognizedWorker}
              className="text-md h-10 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold rounded-xl"
              size="sm"
          >
            <Camera className="w-4 h-4 mr-1" />
            검사 시작
          </Button>

          <Separator orientation="vertical" className="h-6 bg-slate-700" />

          {/* 출입 기록 */}
          <Button
              onClick={handleCheckIn}
              disabled={!isPpeChecked_TEMP}
              className="text-md h-10 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl"
              size="sm"
              variant="secondary"
          >
            <LogIn className="w-4 h-4 mr-1" />
            출입
          </Button>

          {/* 퇴근 기록 */}
          <Button
              onClick={handleCheckOut}
              className="text-md h-10 px-4 border-cyan-500/50 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 font-semibold rounded-xl"
              size="sm"
              variant="outline"
          >
            <LogOut className="w-4 h-4 mr-1" />
            퇴근
          </Button>
        </div>
      </header>
  );

  return (
      // 1. 전체 레이아웃 (세로 Flex): h-screen 유지
      <div className="flex flex-col h-screen bg-slate-950">

        <Header />

        {/* 2. 메인 컨텐츠 영역: 웹캠이 헤더를 제외한 모든 공간을 채우도록 p-0으로 설정 */}
        {/* p-0으로 패딩을 제거 */}
        <main className="flex-grow flex flex-col items-center justify-center p-0 overflow-hidden">
          {/* 카드 영역: max-w-none으로 너비 제한 해제. 웹캠이 화면을 가득 채우도록 설정 */}
          <Card className="w-full max-w-none bg-slate-900 border-slate-800 shadow-2xl shadow-cyan-500/10 flex flex-col flex-grow min-h-0">

            {/* CardHeader 제거: 타이틀 텍스트 제거 요청 반영 */}

            {/* 카드 내용 (웹캠): flex-grow와 min-h-0을 사용하여 남은 공간을 모두 차지 */}
            {/* p-0으로 패딩을 제거하여 웹캠이 화면을 가득 채우도록 합니다. */}
            <CardContent className="flex-grow flex flex-col justify-center items-center p-0 min-h-0">

              {/* 웹캠 UI 컨테이너: h-full과 w-full로 컨테이너를 가득 채움 */}
              <div className="relative w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow-inner flex-grow min-h-0">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    // w-full h-full로 컨테이너를 가득 채우고, object-cover로 비율을 유지
                    className="w-full h-full object-cover transform -scale-x-100"
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
        </main>
      </div>
  );
}