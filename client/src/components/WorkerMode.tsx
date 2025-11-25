import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Worker } from '../types';
import { LogIn, LogOut, ArrowLeft, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Chatbot } from './Chatbot';

// -------------------------------------------------------------------------
// 🛠️ 설정: Python FastAPI 서버 설정
// -------------------------------------------------------------------------
const WEBSOCKET_URL = "ws://100.64.239.86:9000/ws/face";
const FRAME_SEND_INTERVAL_MS = 500;
// -------------------------------------------------------------------------

interface WorkerModeProps {
  workers: Worker[];
  requiredEquipment: string[];
  checkedInWorkerIds: Set<string>;
  onCheckIn: (workerId: string) => void;
  onCheckOut: (workerId: string) => void;
  onBack: () => void;
}

export function WorkerMode({
                             requiredEquipment,
                             checkedInWorkerIds,
                             onCheckIn,
                             onCheckOut,
                             onBack,
                           }: WorkerModeProps) {
  const [step, setStep] = useState<'face-recognition' | 'equipment-check'>('face-recognition');
  const [recognizedWorker, setRecognizedWorker] = useState<Worker | null>(null);
  const [detectedEquipment, setDetectedEquipment] = useState<{ [key: string]: boolean }>({});
  const [isAlreadyCheckedIn, setIsAlreadyCheckedIn] = useState(false);

  // 웹캠 관련
  const webcamRef = useRef<Webcam>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamReady, setIsCamReady] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState("웹캠 준비 중...");

  // 웹소켓 관련
  const websocketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 웹캠 시작
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setIsCamReady(true);
        setCamError(null);
        setRecognitionStatus("인식 대기 중...");
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setCamError("웹캠을 시작할 수 없습니다. 권한을 확인해주세요.");
        setIsCamReady(false);
      }
    };
    startCamera();
  }, []);

  // 2. 웹소켓 연결 및 AI 통신
  useEffect(() => {
    if (!isCamReady) return;

    websocketRef.current = new WebSocket(WEBSOCKET_URL);

    websocketRef.current.onopen = () => {
      console.log("Python AI 서버 연결 성공");
      setRecognitionStatus("얼굴 인식 중...");

      // 검사할 보호구 목록 전송 (영문 변환이 필요할 수 있으나, 일단 그대로 전송)
      const configPayload = {
        type: "CONFIG",
        required: requiredEquipment
      };
      websocketRef.current.send(JSON.stringify(configPayload));

      // 프레임 전송 루프 시작
      intervalRef.current = setInterval(() => {
        if (!webcamRef.current || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        // 🛠️ [핵심 수정 1] 얼굴 인식 단계뿐만 아니라 보호구 검사 단계에서도 계속 프레임을 보냄
        // Python 서버가 매 프레임마다 얼굴+보호구를 같이 보기 때문
        const frameDataUrl = webcamRef.current.getScreenshot();
        if (frameDataUrl) {
          try {
            websocketRef.current.send(JSON.stringify({ image: frameDataUrl }));
          } catch (err) {
            console.error("프레임 전송 오류:", err);
          }
        }
      }, FRAME_SEND_INTERVAL_MS);
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.status === "SUCCESS") {
          const serverWorker = message.worker;

          // 1. 작업자 정보 처리 (아직 인식 안 된 경우)
          if (!recognizedWorker) {
            const worker: Worker = {
              id: serverWorker.worker_id,
              name: serverWorker.name,
              team: serverWorker.department,
              employeeNumber: serverWorker.employee_number,
            };
            setRecognizedWorker(worker);

            const alreadyCheckedIn = checkedInWorkerIds.has(worker.id);
            setIsAlreadyCheckedIn(alreadyCheckedIn);

            if (alreadyCheckedIn) {
              setRecognitionStatus("퇴근 대기 중");
              // 퇴근 모드에서는 보호구 검사 단계로 넘어가지 않고 여기서 대기하거나 바로 처리 가능
            } else {
              setStep('equipment-check');
              setRecognitionStatus("보호구 검사 중");
            }
          }

          // 🛠️ [핵심 수정 2] 시뮬레이션(Math.random) 제거하고 실제 서버 데이터 반영
          // recognizedWorker가 있더라도 실시간으로 보호구 상태를 업데이트함
          if (message.ppe_status && message.ppe_status.detections) {
            const detections = message.ppe_status.detections;
            // 예: detections = [{ label: "helmet", ... }, { label: "vest", ... }]
            const detectedLabels = new Set(detections.map((d: any) => d.label));

            const newDetectedState: { [key: string]: boolean } = {};
            requiredEquipment.forEach(eq => {
              // 주의: Python YOLO 모델의 label(영어)과 React의 requiredEquipment(한글?)이 일치해야 함
              // 불일치 시 매핑 로직 필요. 여기서는 문자열이 포함되는지로 느슨하게 체크
              newDetectedState[eq] = Array.from(detectedLabels).some((label: any) =>
                  label.toString().toLowerCase().includes(eq.toLowerCase()) ||
                  eq.toLowerCase().includes(label.toString().toLowerCase())
              );
            });
            setDetectedEquipment(newDetectedState);
          }

        } else if (message.status === "FAILURE") {
          // 얼굴을 놓쳤을 때
          if (!recognizedWorker) {
            setRecognitionStatus("얼굴을 찾을 수 없습니다.");
          }
          // 이미 인식된 상태라면(보호구 검사 중) 화면에 경고를 띄우지 않고 기존 상태 유지하거나 무시
        }

      } catch (err) {
        console.error("메시지 처리 오류:", err);
      }
    };

    websocketRef.current.onclose = () => {
      console.log("서버 연결 종료");
      setRecognitionStatus("서버 연결 끊김");
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    websocketRef.current.onerror = () => {
      setRecognitionStatus("서버 연결 오류");
    };

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (websocketRef.current) websocketRef.current.close();
    };
  }, [isCamReady, recognizedWorker, requiredEquipment, checkedInWorkerIds]); // recognizedWorker가 바뀌어도 연결은 유지되도록 의존성 관리 주의

  // (시뮬레이션 토글 함수 제거 - 실제 감지만 사용)

  // 모든 보호구 착용 확인
  const allEquipmentDetected = requiredEquipment.length > 0 && requiredEquipment.every(eq => detectedEquipment[eq]);

  // 출입 처리
  const handleCheckInClick = () => {
    if (recognizedWorker && allEquipmentDetected) {
      onCheckIn(recognizedWorker.id);
      setIsAlreadyCheckedIn(true);
      setTimeout(() => handleReset(), 1000);
    }
  };

  // 퇴근 처리
  const handleCheckOutClick = () => {
    if (recognizedWorker) {
      onCheckOut(recognizedWorker.id);
      setIsAlreadyCheckedIn(false);
      handleReset();
    }
  };

  // 초기화
  const handleReset = () => {
    setStep('face-recognition');
    setRecognizedWorker(null);
    setDetectedEquipment({});
    setIsAlreadyCheckedIn(false);
    setRecognitionStatus("얼굴 인식 중...");
  };

  return (
      <div className="size-full flex flex-col bg-black">
        {/* 헤더 */}
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-white font-bold">스마트 안전 출입 시스템</h3>
                <p className="text-gray-400 text-sm">작업자 모드</p>
              </div>
            </div>
            <Button onClick={onBack} variant="outline" className="bg-slate-900 text-white border-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" /> 메인 화면
            </Button>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-auto">

          {/* 좌측 웹캠 영역 */}
          <div className="flex-1 lg:w-3/4 bg-slate-950 rounded-2xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
            {camError && <p className="text-red-400">{camError}</p>}
            {!isCamReady && !camError && <p className="text-cyan-400">카메라 로딩 중...</p>}

            {isCamReady && (
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    mirrored={true}
                />
            )}

            {/* 오버레이 가이드 */}
            <div className="absolute inset-0 border-[20px] border-black/50 pointer-events-none z-10"></div>

            {/* 상태 메시지 하단 오버레이 */}
            <div className="absolute bottom-6 bg-slate-900/80 px-6 py-2 rounded-full border border-cyan-500/30 z-20">
              <p className="text-cyan-400 font-semibold">
                {step === 'face-recognition' ? recognitionStatus : "보호구 착용 상태 확인 중..."}
              </p>
            </div>
          </div>

          {/* 우측 정보 패널 */}
          <div className="lg:w-1/4 flex flex-col gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex-1">
              <h2 className="text-white text-2xl font-bold mb-4">
                {step === 'face-recognition' ? '1단계: 얼굴 인식' : '2단계: 안전 검사'}
              </h2>

              {recognizedWorker ? (
                  <div className="mb-6 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl">
                    <p className="text-cyan-400 font-bold text-lg">{recognizedWorker.name} 님</p>
                    <p className="text-gray-400 text-sm">{recognizedWorker.team} / {recognizedWorker.employeeNumber}</p>
                  </div>
              ) : (
                  <p className="text-gray-400 mb-6">카메라 정면을 응시해주세요.</p>
              )}

              {/* 보호구 리스트 (실시간 상태 반영) */}
              {step === 'equipment-check' && (
                  <div className="space-y-2">
                    {requiredEquipment.map(eq => (
                        <div key={eq} className={`flex items-center justify-between p-3 rounded-lg border ${
                            detectedEquipment[eq]
                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                : 'bg-red-500/20 border-red-500 text-red-400'
                        }`}>
                          <span className="font-medium">{eq}</span>
                          {detectedEquipment[eq] ? <UserCheck className="w-5 h-5"/> : <span className="text-xs font-bold">미착용</span>}
                        </div>
                    ))}
                  </div>
              )}
            </div>

            {/* 버튼 영역 */}
            {step === 'equipment-check' && (
                <Button
                    onClick={handleCheckInClick}
                    disabled={!allEquipmentDetected}
                    className={`h-16 text-lg font-bold ${allEquipmentDetected ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800'}`}
                >
                  {allEquipmentDetected ? <><LogIn className="mr-2"/> 출입 허용</> : "보호구 미착용"}
                </Button>
            )}

            {/* 리셋 버튼 */}
            <Button onClick={handleReset} variant="ghost" className="text-gray-500 hover:text-white">
              처음으로 돌아가기
            </Button>
          </div>
        </div>

        <Chatbot />
      </div>
  );
}