// --- 임포트 구문 (규칙에 맞게 수정) ---

import { useState, useRef, useEffect } from 'react';
// 2. 상대 경로: ../types.ts
import { Worker } from '../types';
import { Camera, LogIn, LogOut, ChevronLeft, Loader2 } from 'lucide-react';

// 1. 별칭 경로: @/components/ui/button.tsx
import { Button } from '@/components/ui/button';
// 2. 상대 경로: ./Chatbot.tsx
import { Chatbot } from './Chatbot';
// 1. 별칭 경로: @/components/ui/popover.tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// 1. 별칭 경로: @/components/ui/input.tsx
import { Input } from './ui/input';
// 1. 별칭 경로: @/components/ui/card.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// 2. 상대 경로: ../App.tsx
import type { Screen } from '../App';

// --- (여기부터는 기존 코드와 동일) ---

// Mock Worker (시뮬레이션용)
const SIMULATED_WORKER = { id: "1", name: "홍길동 (A팀)" };

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

  // 보호구 검사 통과 여부 (임시)
  const isPpeChecked_TEMP = false; // TODO: 이 상태는 App.tsx의 props에서 받아와야 함

  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. 컴포넌트 마운트 시 웹캠 켜기
  useEffect(() => {
    let stream: MediaStream;

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }, // 전면 카메라
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setWebcamError("웹캠을 켤 수 없습니다. 카메라 권한을 확인해주세요.");
        setIsRecognizing(false);
      }
    };

    startWebcam();

    // 2. (임시) 4초 후 얼굴 인식 시뮬레이션
    // TODO: 백엔드 API가 준비되면 이 부분을 API 호출 로직(setInterval)으로 교체
    const simulationTimer = setTimeout(() => {
      if (!webcamError) { // 웹캠이 켜져 있을 때만
        setRecognizedWorker(SIMULATED_WORKER);
        setIsRecognizing(false);
      }
    }, 4000); // 4초 후 인식 성공 (시뮬레이션)

    // 3. 컴포넌트 언마운트 시 웹캠 끄기 (리소스 정리)
    return () => {
      clearTimeout(simulationTimer);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamError]); // webcamError가 바뀔 때를 제외하고는 한 번만 실행

  // '보호구 검사 시작' 버튼 클릭 시
  const handlePpeCheck = () => {
    // 인식된 작업자 정보를 가지고 검사 화면으로 이동
    // TODO: recognizedWorker 정보를 onNavigate를 통해 App.tsx로 전달해야 함
    onNavigate("inspection");
  };

  return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 md:p-8">
        <Button
            variant="ghost"
            className="absolute top-6 left-6 text-gray-400 hover:text-white"
            onClick={() => onNavigate("modeSelection")}
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

            {/* 얼굴 인식 웹캠 UI (기존 Select 대체) */}
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
            </Button>

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

