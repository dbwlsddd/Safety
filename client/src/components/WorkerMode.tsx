import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Worker, WorkerStatus } from '../types';
import { LogIn, LogOut, ArrowLeft, UserCheck, Coffee, DoorOpen } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// -------------------------------------------------------------------------
// 🛠️ 설정: Python FastAPI 서버 설정
// -------------------------------------------------------------------------
const WEBSOCKET_URL = "wss://100.64.239.86:9000/ws/face"; // ✅ 환경에 맞게 IP 확인 필요
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

  // 얼굴 인식 잠금용 Ref (한 번 인식되면 다른 얼굴 인식 방지)
  const isWorkerLockedRef = useRef(false);

  // 1. 웹캠 시작
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setIsCamReady(true);
        setCamError(null);
        setRecognitionStatus("인식 대기 중...");
        // 스트림 트랙 정지 (Webcam 컴포넌트가 알아서 다시 요청함)
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

          // ✅ 작업자가 아직 확정되지 않았을 때만 인식 수행
          if (!isWorkerLockedRef.current) {
            isWorkerLockedRef.current = true; // 잠금

            // ID 처리 (서버가 숫자로 보내면 문자열로 변환)
            const workerId = String(serverWorker.worker_id || serverWorker.id);
            const status = workerStatusMap[workerId] || 'OFF_WORK';

            // 타입 호환성을 위해 변환
            const worker: Worker = {
              id: Number(workerId), // types.ts가 number라면 Number() 변환 필요
              name: serverWorker.name,
              // 서버 필드명(department)과 프론트 필드명(team) 매핑 확인
              team: serverWorker.department || serverWorker.team || 'Unknown',
              employeeNumber: serverWorker.employee_number || '',
              status: status as WorkerStatus
            };

            setRecognizedWorker(worker);
            setCurrentStatus(status);

            // 상태에 따른 화면 전환
            if (status === 'WORKING') {
              setStep('working-menu');
              setRecognitionStatus("안녕하세요! 작업 중이시군요.");
            } else {
              setStep('equipment-check');
              setRecognitionStatus(status === 'RESTING' ? "복귀 전 보호구 검사" : "출근 전 보호구 검사");
            }
          }

          // 보호구 감지 상태 업데이트 (화면 전환 후에도 계속 갱신)
          if (message.ppe_status && message.ppe_status.detections) {
            const detections = message.ppe_status.detections;
            const detectedLabels = new Set(detections.map((d: any) => d.label));

            const newDetectedState: { [key: string]: boolean } = {};
            requiredEquipment.forEach(eq => {
              // 'Helmet' <-> '헬멧' 등 매칭 로직 (단순 포함 여부 체크)
              newDetectedState[eq] = Array.from(detectedLabels).some((label: any) =>
                  label.toString().toLowerCase().includes(eq.toLowerCase()) ||
                  eq.toLowerCase().includes(label.toString().toLowerCase())
              );
            });
            setDetectedEquipment(newDetectedState);
          }

        } else if (message.status === "FAILURE") {
          // 얼굴 미탐지 시 (아직 잠기지 않았을 때만 상태 메시지 변경)
          if (!isWorkerLockedRef.current && step === 'face-recognition') {
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
  }, [isCamReady, requiredEquipment, workerStatusMap, step]);

  // 모든 필수 보호구가 감지되었는지 확인
  const allEquipmentDetected = requiredEquipment.length > 0 && requiredEquipment.every(eq => detectedEquipment[eq]);

  // 초기화 함수
  const handleReset = () => {
    isWorkerLockedRef.current = false; // 잠금 해제
    setStep('face-recognition');
    setRecognizedWorker(null);
    setDetectedEquipment({});
    setCurrentStatus('OFF_WORK');
    setRecognitionStatus("얼굴 인식 중...");
  };

  // 🆕 DB 상태 업데이트 함수
  const updateWorkerStatusInDB = async (workerId: number | string, newStatus: string) => {
    try {
      const response = await fetch(`/api/workers/${workerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('상태 업데이트 실패');
      return true;
    } catch (error) {
      console.error("DB 업데이트 오류:", error);
      toast.error("서버에 상태를 저장하지 못했습니다.");
      return false;
    }
  };

  // 액션 처리 핸들러 (UI + DB 업데이트)
  const handleAction = async (action: 'CHECK_IN' | 'CHECK_OUT' | 'REST' | 'RETURN') => {
    if (!recognizedWorker) return;

    // 1. 변경할 상태 결정
    let newStatus = 'OFF_WORK';
    let message = '';

    switch (action) {
      case 'CHECK_IN':
        newStatus = 'WORKING';
        message = `${recognizedWorker.name}님, 오늘도 안전작업 하세요!`;
        onCheckIn(String(recognizedWorker.id));
        break;
      case 'CHECK_OUT':
        newStatus = 'OFF_WORK';
        message = `${recognizedWorker.name}님, 퇴근 처리되었습니다. 고생하셨습니다.`;
        onCheckOut(String(recognizedWorker.id));
        break;
      case 'REST':
        newStatus = 'RESTING';
        message = `${recognizedWorker.name}님, 휴식/외출 상태로 변경되었습니다.`;
        onRest(String(recognizedWorker.id));
        break;
      case 'RETURN':
        newStatus = 'WORKING';
        message = `${recognizedWorker.name}님, 업무에 복귀하셨습니다.`;
        onReturn(String(recognizedWorker.id));
        break;
    }

    // 2. DB 업데이트 호출 (비동기)
    await updateWorkerStatusInDB(recognizedWorker.id, newStatus);

    // 3. 알림 및 초기화
    toast.success(message);

    // 잠시 대기 후 초기화면으로
    setTimeout(() => handleReset(), 2000);
  };

  return (
      <div className="size-full flex flex-col bg-black h-screen">
        {/* 헤더 */}
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 shrink-0">
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
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">

          {/* 좌측 웹캠 영역 */}
          <div className="flex-1 lg:w-3/4 bg-slate-950 rounded-2xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
            {camError && <p className="text-red-400">{camError}</p>}
            {!isCamReady && !camError && <p className="text-cyan-400 animate-pulse">카메라 연결 중...</p>}

            {isCamReady && (
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    mirrored={true}
                    screenshotFormat="image/jpeg"
                />
            )}

            {/* 오버레이 효과 */}
            <div className="absolute inset-0 border-[20px] border-black/50 pointer-events-none z-10 rounded-2xl"></div>

            {/* 상태 메시지 바 */}
            <div className="absolute bottom-8 bg-slate-900/80 backdrop-blur-md px-8 py-3 rounded-full border border-cyan-500/30 z-20 shadow-lg">
              <p className="text-cyan-400 font-semibold text-lg">{recognitionStatus}</p>
            </div>
          </div>

          {/* 우측 정보 패널 */}
          <div className="lg:w-1/4 flex flex-col gap-4 min-w-[320px]">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col shadow-xl">
              <h2 className="text-white text-2xl font-bold mb-4 border-b border-slate-800 pb-4">
                {step === 'face-recognition' ? '1단계: 얼굴 인식' :
                    step === 'equipment-check' ? '2단계: 안전 검사' : '작업자 메뉴'}
              </h2>

              {recognizedWorker ? (
                  <div className="mb-6 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-cyan-500/20 rounded-full">
                        <UserCheck className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-cyan-400 font-bold text-xl">{recognizedWorker.name} 님</p>
                        <p className="text-gray-400 text-sm">{recognizedWorker.team} / {recognizedWorker.employeeNumber}</p>
                      </div>
                    </div>
                    <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        currentStatus === 'WORKING' ? 'bg-green-500/20 text-green-400' :
                            currentStatus === 'RESTING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {currentStatus === 'WORKING' ? '현재 상태: 근무 중' :
                          currentStatus === 'RESTING' ? '현재 상태: 휴식 중' : '현재 상태: 퇴근'}
                    </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500 space-y-4">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <p>카메라 정면을 응시해주세요.</p>
                  </div>
              )}

              {/* [CASE A] 보호구 검사 화면 */}
              {step === 'equipment-check' && (
                  <div className="flex-1 flex flex-col animate-in fade-in">
                    <div className="space-y-3 mb-6 flex-1 overflow-y-auto">
                      <p className="text-sm text-gray-400 font-medium mb-2">필수 보호구 착용 상태</p>
                      {requiredEquipment.map(eq => (
                          <div key={eq} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                              detectedEquipment[eq]
                                  ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                  : 'bg-red-500/10 border-red-500/50 text-red-400'
                          }`}>
                            <span className="font-bold text-lg">{eq}</span>
                            {detectedEquipment[eq] ?
                                <div className="flex items-center gap-1"><UserCheck className="w-5 h-5"/><span>확인됨</span></div> :
                                <span className="text-sm font-bold bg-red-500/20 px-2 py-1 rounded">미착용</span>
                            }
                          </div>
                      ))}
                    </div>
                    <Button
                        onClick={() => handleAction(currentStatus === 'RESTING' ? 'RETURN' : 'CHECK_IN')}
                        disabled={!allEquipmentDetected}
                        className={`h-16 text-lg font-bold w-full rounded-xl transition-all ${
                            allEquipmentDetected
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:scale-[1.02]'
                                : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {allEquipmentDetected
                          ? (currentStatus === 'RESTING' ? <><LogIn className="mr-2"/> 업무 복귀</> : <><LogIn className="mr-2"/> 출입 승인</>)
                          : "보호구를 착용해주세요"}
                    </Button>
                  </div>
              )}

              {/* [CASE B] 근무 중 메뉴 */}
              {step === 'working-menu' && (
                  <div className="flex-1 flex flex-col gap-4 justify-center animate-in fade-in">
                    <p className="text-blue-200 text-center mb-2 font-medium bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                      안전하게 작업 중이시군요!<br/>원하시는 작업을 선택하세요.
                    </p>

                    <Button
                        onClick={() => handleAction('REST')}
                        className="h-16 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:text-yellow-400 group"
                    >
                      <Coffee className="mr-2 w-6 h-6 group-hover:text-yellow-400 transition-colors" /> 외출 / 휴식
                    </Button>

                    <Button
                        onClick={() => handleAction('CHECK_OUT')}
                        className="h-16 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:text-red-400 group"
                    >
                      <DoorOpen className="mr-2 w-6 h-6 group-hover:text-red-400 transition-colors" /> 퇴근 하기
                    </Button>
                  </div>
              )}
            </div>

            <Button onClick={handleReset} variant="ghost" className="text-gray-500 hover:text-white h-12 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all">
              처음으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
  );
}