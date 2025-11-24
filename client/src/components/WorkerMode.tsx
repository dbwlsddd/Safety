// 🛠️ 추가: useEffect, useRef 임포트
import { useState, useEffect, useRef } from 'react';
// 🛠️ 추가: react-webcam 임포트
import Webcam from 'react-webcam';
import { Worker } from '../types';
import { LogIn, LogOut, ArrowLeft, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Chatbot } from './Chatbot';

// -------------------------------------------------------------------------
// 🛠️ 설정: Python FastAPI 서버 설정
// -------------------------------------------------------------------------

/** * 1. Python FastAPI WebSocket 엔드포인트
 * (FastAPI 서버의 @app.websocket("/ws/face")와 일치)
 */
const WEBSOCKET_URL = "wss://100.64.239.86:9000/ws/face";

/**
 * 2. 프레임 전송 간격 (밀리초 단위)
 */
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
                             workers,
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

  // 웹소켓 및 프레임 전송 관련
  const websocketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 웹캠 시작
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setIsCamReady(true);
        setCamError(null);
        setRecognitionStatus("인식 대기 중...");
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setCamError("웹캠을 시작할 수 없습니다. 브라우저 권한을 확인해주세요.");
        setIsCamReady(false);
      }
    };

    startCamera();
  }, []);

  // 🛠️ [수정됨] 웹소켓 연결 및 프레임 전송 로직 (Python/FastAPI 호환)
  useEffect(() => {
    // 웹캠이 준비된 후에만 웹소켓 연결 시도
    if (!isCamReady) return;

    // 1. 웹소켓 연결
    websocketRef.current = new WebSocket(WEBSOCKET_URL);

    // ❗️ Python 서버는 JSON (Text)을 기대하므로 binaryType을 설정하지 않습니다.
    // websocketRef.current.binaryType = "blob"; // (주석 처리)

    // 2. 연결 성공 시
    websocketRef.current.onopen = () => {
      console.log("WebSocket 연결 성공 (to Python FastAPI)");
      setRecognitionStatus("얼굴 인식 중...");

      // 3. n 밀리초마다 프레임 전송 시작
      intervalRef.current = setInterval(() => {
        if (
            !webcamRef.current ||
            !websocketRef.current ||
            websocketRef.current.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        if (step !== 'face-recognition' || recognizedWorker) {
          return;
        }

        // 4. 프레임 캡처 (Base64 데이터 URL)
        const frameDataUrl = webcamRef.current.getScreenshot();
        if (!frameDataUrl) return;

        // 5. 🛠️ [수정됨] (Client -> Server) Base64를 JSON에 담아 텍스트로 전송
        try {
          const payload = {
            image: frameDataUrl // "data:image/jpeg;base64,..." 문자열 그대로
          };
          websocketRef.current.send(JSON.stringify(payload));
        } catch (err) {
          console.error("프레임 JSON 전송 오류:", err);
        }

        // [기존 Blob 전송 로직 - 삭제]
        // fetch(frameDataUrl)
        //     .then(res => res.blob())
        //     .then(blob => { ... })

      }, FRAME_SEND_INTERVAL_MS);
    };

    // 6. 🛠️ [수정됨] (Server -> Client) 서버로부터 메시지 수신
    websocketRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("서버 메시지 수신:", message);

        if (step !== 'face-recognition' || recognizedWorker) {
          console.log("이미 인식되었거나, 얼굴 인식 단계가 아니므로 메시지를 무시합니다.");
          return;
        }

        switch (message.status) {
          case "SUCCESS":
            if (!message.worker) {
              console.error("SUCCESS 메시지에 'worker' 객체가 없습니다.");
              return;
            }

            // 🛠️ [중요] 서버 데이터(worker_id)를 클라이언트 타입(id)으로 매핑
            const serverWorker = message.worker;
            const worker: Worker = {
              id: serverWorker.worker_id, // Python 서버는 worker_id를 보냄
              name: serverWorker.name,
              team: serverWorker.department,
              employeeNumber: serverWorker.employee_number,
              // ... Worker 타입에 다른 필드가 있다면 여기에 추가
            };

            setRecognizedWorker(worker);

            // 이제 'worker.id'를 안전하게 사용 가능
            const alreadyCheckedIn = checkedInWorkerIds.has(worker.id);
            setIsAlreadyCheckedIn(alreadyCheckedIn);

            if (alreadyCheckedIn) {
              setRecognitionStatus("퇴근 대기 중");
            } else {
              setStep('equipment-check');
              setRecognitionStatus("보호구 검사 중");

              // 시뮬레이션용 초기값 설정 (기존 로직 유지)
              const initialEquipment: { [key: string]: boolean } = {};
              requiredEquipment.forEach(eq => {
                initialEquipment[eq] = eq === '헬멧' ? Math.random() > 0.5 : false;
              });
              setDetectedEquipment(initialEquipment);
            }
            break;

          case "FAILURE":
            // Python 서버는 현재 'FAILURE'를 보내지 않음 (필요 시 서버에 추가)
            setRecognitionStatus(message.message || "인식된 사용자가 없습니다.");
            setTimeout(() => {
              if (step === 'face-recognition') setRecognitionStatus("얼굴 인식 중...");
            }, 2000);
            break;

          case "ERROR":
            setRecognitionStatus(message.message || "서버 처리 오류");
            setTimeout(() => {
              if (step === 'face-recognition') setRecognitionStatus("얼굴 인식 중...");
            }, 2000);
            break;

          default:
            console.warn("알 수 없는 메시지 상태(status):", message.status);
        }

      } catch (err) {
        console.error("서버 메시지 처리 중 오류:", err);
      }
    };

    // 7. 연결 종료 시
    websocketRef.current.onclose = () => {
      console.log("WebSocket 연결 종료");
      if (step === 'face-recognition' && !recognizedWorker) {
        setRecognitionStatus("연결 끊김");
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    // 8. 에러 발생 시
    websocketRef.current.onerror = (err) => {
      console.error("WebSocket 오류:", err);
      setCamError("안전 서버에 연결할 수 없습니다. 관리자에게 문의하세요.");
      setRecognitionStatus("연결 오류");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    // 9. 컴포넌트 언마운트 시 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (websocketRef.current && (websocketRef.current.readyState === WebSocket.OPEN || websocketRef.current.readyState === WebSocket.CONNECTING)) {
        websocketRef.current.close();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCamReady]); // ❗️ 의존성 배열에서 step, recognizedWorker 등을 제거 (재연결 방지)


  // 🛠️ 보호구 착용 시뮬레이션 (기존과 동일)
  const toggleEquipment = (equipment: string) => {
    setDetectedEquipment(prev => ({
      ...prev,
      [equipment]: !prev[equipment],
    }));
  };

  // 모든 보호구 착용 확인
  const allEquipmentDetected = requiredEquipment.every(eq => detectedEquipment[eq]);

  // 출입 처리
  const handleCheckInClick = () => {
    // ❗️ 'recognizedWorker.id'가 이제 매핑되어 정상 동작
    if (recognizedWorker && allEquipmentDetected) {
      onCheckIn(recognizedWorker.id);
      setIsAlreadyCheckedIn(true);
      setTimeout(() => {
        handleReset();
      }, 1000);
    }
  };

  // 퇴근 처리
  const handleCheckOutClick = () => {
    // ❗️ 'recognizedWorker.id'가 이제 매핑되어 정상 동작
    if (recognizedWorker) {
      onCheckOut(recognizedWorker.id);
      setIsAlreadyCheckedIn(false);
      handleReset();
    }
  };

  // 초기화 함수
  const handleReset = () => {
    setStep('face-recognition');
    setRecognizedWorker(null);
    setDetectedEquipment({});
    setIsAlreadyCheckedIn(false);
    setRecognitionStatus("얼굴 인식 중...");
  };

  return (
      <div className="size-full flex flex-col bg-black">
        {/* 헤더 (기존과 동일) */}
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-white" style={{ fontWeight: 700 }}>스마트 안전 출입 시스템</h3>
                <p className="text-gray-400 text-sm font-medium">작업자 모드</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                  onClick={handleReset}
                  variant="outline"
                  className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-xl font-semibold"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                다시 인식
              </Button>
              <Button
                  onClick={onBack}
                  variant="outline"
                  className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-xl font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                메인 화면
              </Button>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 (기존과 동일) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 overflow-auto">

          {/* 왼쪽: 웹캠 영역 (3/4) */}
          <div className="flex-1 lg:w-3/4 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[300px] flex items-center justify-center">

            {/* 1. 웹캠 로딩/오류 상태 */}
            {camError && (
                <div className="text-center p-4 z-10">
                  <p className="text-red-400 font-semibold text-lg">웹캠 오류</p>
                  <p className="text-gray-400 text-sm mt-1">{camError}</p>
                </div>
            )}
            {!isCamReady && !camError && (
                <div className="text-center z-10">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-cyan-400 font-semibold">웹캠을 시작하는 중...</p>
                </div>
            )}

            {/* 2. 웹캠 뷰 (준비되면) */}
            {isCamReady && (
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    mirrored={true}
                    videoConstraints={{ width: 1280, height: 720 }}
                />
            )}

            {/* 3. 중앙 가이드 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-64 h-80 md:w-80 md:h-96 border-4 border-blue-500/50 rounded-3xl relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500/20 backdrop-blur-sm border border-blue-500/50 rounded-full">
                <span className="text-blue-400 text-sm font-semibold">
                  {step === 'face-recognition' ? '얼굴을 화면에 맞춰주세요' : '전신을 화면에 맞춰주세요'}
                </span>
                </div>
                {/* 코너 마커 */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-cyan-400"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-cyan-400"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-cyan-400"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-cyan-400"></div>
              </div>
            </div>

            {/* 4. 스캔 효과 */}
            {step === 'face-recognition' && !recognizedWorker && isCamReady && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse" style={{ animation: 'scan 2s infinite linear' }}></div>
                </div>
            )}

            {/* 5. 인식 완료 오버레이 */}
            {recognizedWorker && step === 'face-recognition' && (
                <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-500 z-30">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-green-500/50">
                      <UserCheck className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-green-400 text-2xl font-semibold">얼굴 인식 완료</p>
                  </div>
                </div>
            )}

            {/* Custom Keyframes */}
            <style>{`
            @keyframes scan {
              0% { transform: translateY(-100%) }
              50% { transform: translateY(100%) }
              100% { transform: translateY(-100%) }
            }
          `}</style>

            {/* 6. 하단 안내 */}
            <div className="absolute bottom-6 left-6 right-6 bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded-xl p-4 z-30">
              <p className="text-gray-400 text-sm text-center font-medium">
                {step === 'face-recognition' && !recognizedWorker
                    ? recognitionStatus
                    : step === 'equipment-check'
                        ? '보호구 착용 상태를 확인(클릭)하세요.'
                        : `인식 완료: ${recognizedWorker?.name}님, ${isAlreadyCheckedIn ? '퇴근 대기 중' : '검사 완료'}`
                }
              </p>
            </div>
          </div>

          {/* 오른쪽: 상태 및 안내 영역 (1/4) */}
          <div className="lg:w-1/4 flex flex-col gap-4">
            {/* 단계 안내 */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
              <div className="space-y-4">
                {step === 'face-recognition' ? (
                    <>
                      {/* 1단계 얼굴 인식 */}
                      <div>
                        <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 700 }}>
                          1단계 얼굴 인식
                        </h2>
                        <p className="text-gray-400 text-sm font-medium">
                          카메라를 보고 잠시 기다려주세요.
                        </p>
                      </div>

                      {!recognizedWorker && (
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center h-14">
                            {isCamReady && !camError && (
                                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                            )}
                            <p className="text-cyan-400 font-semibold">
                              {recognitionStatus}
                            </p>
                          </div>
                      )}

                      {recognizedWorker && (
                          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                            <p className="text-cyan-400 text-sm text-center font-semibold mb-1">
                              {recognizedWorker.name}님, 인식 완료
                            </p>
                            <p className="text-gray-400 text-xs text-center font-medium">
                              {isAlreadyCheckedIn
                                  ? '현장 출입 중입니다. 퇴근을 원하시면 아래 버튼을 누르세요.'
                                  : '보호구 검사(시뮬레이션)를 진행합니다.'
                              }
                            </p>
                          </div>
                      )}
                    </>
                ) : (
                    <>
                      {/* 2단계 보호구 검사 UI */}
                      <div>
                        <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 700 }}>
                          2단계 보호구 검사
                        </h2>
                        {recognizedWorker && (
                            <p className="text-cyan-400 font-semibold mb-3">
                              {recognizedWorker.name}님, 안전 검사 중
                            </p>
                        )}
                        <p className="text-gray-400 text-sm font-medium">
                          필수 보호구 착용 상태
                        </p>
                      </div>

                      {/* 보호구 체크리스트 */}
                      <div className="space-y-2">
                        {requiredEquipment.map((equipment) => (
                            <button
                                key={equipment}
                                onClick={() => toggleEquipment(equipment)}
                                className={`w-full px-4 py-3 rounded-xl font-semibold transition-all shadow-md ${
                                    detectedEquipment[equipment]
                                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                                        : 'bg-red-500/20 border-2 border-red-500 text-red-400'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{equipment}</span>
                                <span className="text-sm">
                            {detectedEquipment[equipment] ? '✓ 착용' : '✗ 미착용'}
                          </span>
                              </div>
                            </button>
                        ))}
                      </div>

                      {/* 시뮬레이션 안내 */}
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-blue-400 text-xs text-center font-medium">
                          💡 (시뮬레이션) 보호구를 클릭하세요
                        </p>
                      </div>
                    </>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            {recognizedWorker && (
                <div className="space-y-3">
                  {step === 'face-recognition' && isAlreadyCheckedIn && (
                      <Button
                          onClick={handleCheckOutClick}
                          className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/30 rounded-xl"
                          style={{ fontWeight: 700 }}
                      >
                        <LogOut className="w-5 h-5 mr-2" />
                        퇴근
                      </Button>
                  )}

                  {step === 'equipment-check' && (
                      <>
                        <Button
                            onClick={handleCheckInClick}
                            disabled={!allEquipmentDetected}
                            className={`w-full h-16 rounded-xl text-base ${
                                allEquipmentDetected
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl shadow-green-500/30'
                                    : 'bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
                            }`}
                            style={{ fontWeight: 700 }}
                        >
                          <LogIn className="w-5 h-5 mr-2" />
                          출입
                        </Button>

                        <Button
                            onClick={handleCheckOutClick}
                            disabled={true}
                            className='w-full h-16 rounded-xl text-base bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
                            style={{ fontWeight: 700 }}
                        >
                          <LogOut className="w-5 h-5 mr-2" />
                          퇴근 (검사 중)
                        </Button>

                        {!allEquipmentDetected && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                              <p className="text-yellow-400 text-xs text-center font-semibold">
                                ⚠️ 모든 필수 보호구를 착용해야 출입할 수 있습니다
                              </p>
                            </div>
                        )}

                        {allEquipmentDetected && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                              <p className="text-green-400 text-xs text-center font-semibold">
                                ✓ 모든 보호구 착용 완료 - 출입 버튼을 눌러주세요
                              </p>
                            </div>
                        )}
                      </>
                  )}
                </div>
            )}
          </div>
        </div>

        {/* 챗봇 (기존과 동일) */}
        <Chatbot />

        {/* 푸터 (기존과 동일) */}
        <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3">
          <div className="text-center text-gray-500 text-sm font-medium">
            © 2024 endnune safety systems. all rights reserved.
          </div>
        </footer>
      </div>
  );
}