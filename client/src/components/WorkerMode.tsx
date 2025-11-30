import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Worker, WorkerStatus } from '../types';
import { LogIn, LogOut, ArrowLeft, UserCheck, Coffee, DoorOpen } from 'lucide-react';
import { Button } from './ui/button';

// -------------------------------------------------------------------------
// 🛠️ 설정: Python FastAPI 서버 설정
// -------------------------------------------------------------------------
const WEBSOCKET_URL = "wss://100.64.239.86:9000/ws/face";
const FRAME_SEND_INTERVAL_MS = 500;
// -------------------------------------------------------------------------

interface WorkerModeProps {
  workers: Worker[];
  requiredEquipment: string[];
  workerStatusMap: Record<string, WorkerStatus>;
  onCheckIn: (workerId: string) => void;
  onCheckOut: (workerId: string) => void;
  onRest: (workerId: string) => void;
  onReturn: (workerId: string) => void;
  onBack: () => void;
}

export function WorkerMode({
                             requiredEquipment,
                             workerStatusMap,
                             onCheckIn,
                             onCheckOut,
                             onRest,
                             onReturn,
                             onBack,
                           }: WorkerModeProps) {
  const [step, setStep] = useState<'face-recognition' | 'equipment-check' | 'working-menu'>('face-recognition');

  const [recognizedWorker, setRecognizedWorker] = useState<Worker | null>(null);
  const [currentStatus, setCurrentStatus] = useState<WorkerStatus>('OFF_WORK');
  const [detectedEquipment, setDetectedEquipment] = useState<{ [key: string]: boolean }>({});

  const webcamRef = useRef<Webcam>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamReady, setIsCamReady] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState("웹캠 준비 중...");

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

      const configPayload = {
        type: "CONFIG",
        required: requiredEquipment
      };
      websocketRef.current?.send(JSON.stringify(configPayload));

      intervalRef.current = setInterval(() => {
        if (!webcamRef.current || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
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

          // 1. 얼굴 인식 성공 시 로직
          if (!recognizedWorker) { // 여기서 기존 인식된 사람이 있으면 다시 세팅하지 않음 (중요)
            const workerId = String(serverWorker.worker_id);
            const status = workerStatusMap[workerId] || 'OFF_WORK';

            const worker: Worker = {
              id: workerId,
              name: serverWorker.name,
              team: serverWorker.department,
              employeeNumber: serverWorker.employee_number,
            };
            setRecognizedWorker(worker);
            setCurrentStatus(status);

            if (status === 'WORKING') {
              setStep('working-menu');
              setRecognitionStatus("근무 중입니다.");
            } else {
              setStep('equipment-check');
              setRecognitionStatus(status === 'RESTING' ? "복귀 전 안전 검사" : "출근 전 안전 검사");
            }
          }

          // 2. 보호구 감지 결과 업데이트
          if (message.ppe_status && message.ppe_status.detections) {
            const detections = message.ppe_status.detections;
            const detectedLabels = new Set(detections.map((d: any) => d.label));

            const newDetectedState: { [key: string]: boolean } = {};
            requiredEquipment.forEach(eq => {
              newDetectedState[eq] = Array.from(detectedLabels).some((label: any) =>
                  label.toString().toLowerCase().includes(eq.toLowerCase()) ||
                  eq.toLowerCase().includes(label.toString().toLowerCase())
              );
            });
            setDetectedEquipment(newDetectedState);
          }

        } else if (message.status === "FAILURE") {
          // 얼굴을 놓쳤을 때, 이미 인식된 상태(메뉴나 검사화면)라면 화면을 유지해야 함
          if (!recognizedWorker && step === 'face-recognition') {
            setRecognitionStatus("얼굴을 찾을 수 없습니다.");
          }
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
  }, [isCamReady, requiredEquipment, workerStatusMap]);
  // ⚠️ [수정] recognizedWorker를 의존성 배열에서 뺐습니다.
  // 이유: 인식된 후에도 소켓 연결을 유지하고 보호구 데이터를 계속 받기 위함.

  const allEquipmentDetected = requiredEquipment.length > 0 && requiredEquipment.every(eq => detectedEquipment[eq]);

  const handleReset = () => {
    setStep('face-recognition');
    setRecognizedWorker(null);
    setDetectedEquipment({});
    setCurrentStatus('OFF_WORK');
    setRecognitionStatus("얼굴 인식 중...");
  };

  // 🛠️ [로그 문제 해결 핵심] 버튼 클릭 시 핸들러 호출 보장
  const handleAction = (action: 'CHECK_IN' | 'CHECK_OUT' | 'REST' | 'RETURN') => {
    if (!recognizedWorker) {
      console.error("작업자 정보가 없어 액션을 수행할 수 없습니다.");
      return;
    }

    console.log(`액션 실행: ${action}, 작업자: ${recognizedWorker.name}`); // 디버깅 로그

    switch (action) {
      case 'CHECK_IN': onCheckIn(recognizedWorker.id); break;
      case 'CHECK_OUT': onCheckOut(recognizedWorker.id); break;
      case 'REST': onRest(recognizedWorker.id); break;
      case 'RETURN': onReturn(recognizedWorker.id); break;
    }

    // 약간의 지연 후 초기화 (사용자가 완료 메시지를 볼 틈을 줌)
    setTimeout(() => handleReset(), 500);
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

            <div className="absolute inset-0 border-[20px] border-black/50 pointer-events-none z-10"></div>

            <div className="absolute bottom-6 bg-slate-900/80 bg-opacity-200 px-6 py-2 rounded-full border border-cyan-500/30 z-20">
              <p className="text-gray-400 font-semibold">{recognitionStatus}</p>
            </div>
          </div>

          {/* 우측 정보 패널 */}
          <div className="lg:w-1/4 flex flex-col gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
              <h2 className="text-white text-2xl font-bold mb-4">
                {step === 'face-recognition' ? '1단계: 얼굴 인식' :
                    step === 'equipment-check' ? '2단계: 안전 검사' : '작업자 메뉴'}
              </h2>

              {recognizedWorker ? (
                  <div className="mb-6 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl">
                    <p className="text-cyan-400 font-bold text-lg">{recognizedWorker.name} 님</p>
                    <p className="text-gray-400 text-sm">{recognizedWorker.team} / {recognizedWorker.employeeNumber}</p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-gray-400">
                      {currentStatus === 'WORKING' ? '근무 중' :
                          currentStatus === 'RESTING' ? '휴식/외출 중' : '퇴근 상태'}
                    </div>
                  </div>
              ) : (
                  <p className="text-gray-400 mb-6">카메라 정면을 응시해주세요.</p>
              )}

              {/* [CASE A] 보호구 검사 화면 */}
              {step === 'equipment-check' && (
                  <div className="flex-1 flex flex-col">
                    <div className="space-y-2 mb-6 flex-1">
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
                    <Button
                        onClick={() => handleAction(currentStatus === 'RESTING' ? 'RETURN' : 'CHECK_IN')}
                        disabled={!allEquipmentDetected}
                        className={`h-16 text-lg font-bold w-full ${allEquipmentDetected ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800'}`}
                    >
                      {allEquipmentDetected
                          ? (currentStatus === 'RESTING' ? <><LogIn className="mr-2"/> 업무 복귀</> : <><LogIn className="mr-2"/> 출입 허용</>)
                          : "보호구 미착용"}
                    </Button>
                  </div>
              )}

              {/* [CASE B] 근무 중 메뉴 */}
              {step === 'working-menu' && (
                  <div className="flex-1 flex flex-col gap-3 justify-center">
                    <p className="text-blue-200 text-center mb-4 font-medium">
                      안전하게 작업 중이시군요!<br/>원하시는 작업을 선택하세요.
                    </p>

                    <Button
                        onClick={() => handleAction('REST')}
                        className="h-14 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
                    >
                      <Coffee className="mr-2 w-6 h-6" /> 외출 / 휴식
                    </Button>

                    <Button
                        onClick={() => handleAction('CHECK_OUT')}
                        className="h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
                    >
                      <DoorOpen className="mr-2 w-6 h-6" /> 퇴근 하기
                    </Button>
                  </div>
              )}
            </div>

            <Button onClick={handleReset} variant="ghost" className="text-gray-500 hover:text-white h-12">
              처음으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
  );
}