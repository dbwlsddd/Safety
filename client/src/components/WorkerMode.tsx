// 🛠️ 추가: useEffect, useRef 임포트
import { useState, useEffect, useRef } from 'react';
// 🛠️ 추가: react-webcam 임포트
import Webcam from 'react-webcam';
import { Worker } from '../types';
import { LogIn, LogOut, ArrowLeft, UserCheck } from 'lucide-react';
// 🛠️ 수정: Button의 상대 경로를 조정했습니다.
import { Button } from './ui/button';
// 🛠️ 수정: Chatbot의 상대 경로를 조정했습니다.
import { Chatbot } from './Chatbot';

// NOTE: App.tsx에서 변경된 프롭을 반영합니다.
interface WorkerModeProps {
  workers: Worker[];
  requiredEquipment: string[];
  checkedInWorkerIds: Set<string>; // App.tsx에서 추가된 출입 상태 Set
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

  // 🛠️ 추가: 웹캠 관련 state 및 ref
  const webcamRef = useRef<Webcam>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamReady, setIsCamReady] = useState(false);

  // 🛠️ 수정: 함수 이름 변경 (클릭 핸들러가 아니므로)
  // 얼굴 인식 시뮬레이션 (랜덤하게 작업자 선택)
  const runFaceRecognitionSimulation = () => {
    // 인식 시뮬레이션
    const randomWorker = workers[Math.floor(Math.random() * workers.length)];
    setRecognizedWorker(randomWorker);

    // AI 코드의 핵심 로직: 현재 출입 상태 확인
    const alreadyCheckedIn = checkedInWorkerIds.has(randomWorker.id);
    setIsAlreadyCheckedIn(alreadyCheckedIn);

    if (alreadyCheckedIn) {
      // 출입 중인 경우: 퇴근 대기 모드 (step은 face-recognition 유지)
      console.log(`${randomWorker.name}님은 이미 출입 중입니다. 퇴근 대기.`);
    } else {
      // 출입하지 않은 경우: 보호구 검사 단계로 진행
      setTimeout(() => {
        setStep('equipment-check');
        // 초기 상태는 모두 미착용 (false)
        const initialEquipment: { [key: string]: boolean } = {};
        requiredEquipment.forEach(eq => {
          // 시뮬레이션: 50% 확률로 헬멧만 착용 상태로 시작
          initialEquipment[eq] = eq === '헬멧' ? true : false;
        });
        setDetectedEquipment(initialEquipment);
      }, 1500);
    }
  };

  // 🛠️ 추가: 컴포넌트 마운트 시 웹캠 시작 및 인식 시뮬레이션 실행
  useEffect(() => {
    // 웹캠 권한 요청 및 시뮬레이션 시작
    const startCameraAndRecognize = async () => {
      try {
        // 1. 웹캠 권한 요청
        // (react-webcam이 내부적으로 처리하지만, 명시적으로 확인 가능)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // 스트림을 성공적으로 받으면 (권한 획득)
        setIsCamReady(true);
        setCamError(null);

        // (참고: react-webcam이 스트림을 관리하므로 여기서 받은 stream은 닫아줘도 됨)
        stream.getTracks().forEach(track => track.stop());

        // 2. 권한 획득 성공 시, 얼굴 인식 시뮬레이션 바로 실행
        // (카메라 켜지는 시각적 딜레이를 위해 1초 후 실행)
        setTimeout(() => {
          runFaceRecognitionSimulation();
        }, 1000);

      } catch (err) {
        console.error("웹캠 접근 오류:", err);
        setCamError("웹캠을 시작할 수 없습니다. 브라우저 권한을 확인해주세요.");
        setIsCamReady(false);
      }
    };

    // recognizedWorker가 없을 때만 (즉, 초기 상태일 때만) 실행
    if (!recognizedWorker) {
      startCameraAndRecognize();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] : 컴포넌트 마운트 시 1회만 실행

  // 보호구 착용 시뮬레이션 (클릭하면 착용/미착용 토글)
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
    if (recognizedWorker && allEquipmentDetected) {
      onCheckIn(recognizedWorker.id);
      setIsAlreadyCheckedIn(true);
      // 출입 성공 후 초기화 및 face-recognition 상태로 복귀
      setTimeout(() => {
        handleReset();
      }, 1000);
    }
  };

  // 퇴근 처리
  const handleCheckOutClick = () => {
    if (recognizedWorker) {
      onCheckOut(recognizedWorker.id);
      setIsAlreadyCheckedIn(false);
      // 초기화
      handleReset();
    }
  };

  // 초기화 함수
  const handleReset = () => {
    setStep('face-recognition');
    setRecognizedWorker(null);
    setDetectedEquipment({});
    setIsAlreadyCheckedIn(false);

    // 🛠️ 추가: 리셋 시 다시 웹캠 켜고 인식 시도
    // (딜레이를 줘서 UI가 초기화될 시간을 줌)
    setTimeout(() => {
      setIsCamReady(true); // (이미 권한은 있을 것이므로)
      runFaceRecognitionSimulation();
    }, 500);
  };

  return (
      <div className="size-full flex flex-col bg-black">
        {/* 헤더 */}
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

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 overflow-auto">

          {/* 왼쪽: 웹캠 영역 (3/4) */}
          {/* 🛠️ 수정: Mock 웹캠 화면 -> 실제 웹캠 및 상태 표시 */}
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
                />
            )}

            {/* 3. 중앙 가이드 (웹캠 위에 겹치도록 - z-index 추가) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-64 h-80 md:w-80 md:h-96 border-4 border-blue-500/50 rounded-3xl relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500/20 backdrop-blur-sm border border-blue-500/50 rounded-full">
                <span className="text-blue-400 text-sm font-semibold">
                  {step === 'face-recognition' ? '얼굴을 화면에 맞춰주세요' : '전신을 화면에 맞춰주세요'}
                </span>
                </div>
                {/* 코너 마커 (기존과 동일) */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-cyan-400"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-cyan-400"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-cyan-400"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-cyan-400"></div>
              </div>
            </div>

            {/* 4. 스캔 효과 (z-index 추가 및 조건 수정) */}
            {step === 'face-recognition' && !recognizedWorker && isCamReady && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse" style={{ animation: 'scan 2s infinite linear' }}></div>
                </div>
            )}

            {/* 5. 인식 완료 오버레이 (z-index 추가) */}
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

            {/* Custom Keyframes (기존 코드) */}
            <style>{`
            @keyframes scan {
              0% { transform: translateY(-100%) }
              50% { transform: translateY(100%) }
              100% { transform: translateY(-100%) }
            }
          `}</style>

            {/* 6. 하단 안내 (z-index 추가 및 텍스트 수정) */}
            <div className="absolute bottom-6 left-6 right-6 bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded-xl p-4 z-30">
              <p className="text-gray-400 text-sm text-center font-medium">
                {step === 'face-recognition' && !recognizedWorker
                    ? '얼굴 인식을 자동으로 시작합니다...'
                    : step === 'equipment-check'
                        ? '보호구 검사를 진행합니다.'
                        : '인식 완료. 상태를 확인하세요.'
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
                      <div>
                        <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 700 }}>
                          1단계 얼굴 인식
                        </h2>
                        <p className="text-gray-400 text-sm font-medium">
                          뒤로 가서 전신을 보여주세요
                        </p>
                      </div>

                      {/* 🛠️ 수정: "얼굴 인식 시작" 버튼 삭제 및 상태 표시로 변경 */}
                      {!recognizedWorker && (
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center h-14">
                            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                            <p className="text-cyan-400 font-semibold">
                              {isCamReady ? '얼굴 인식 중...' : '웹캠 준비 중...'}
                            </p>
                          </div>
                      )}

                      {/* 인식 후 상태 메시지 (기존 코드 동일) */}
                      {recognizedWorker && (
                          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                            <p className="text-cyan-400 text-sm text-center font-semibold mb-1">
                              {recognizedWorker.name}님, 인식 완료
                            </p>
                            <p className="text-gray-400 text-xs text-center font-medium">
                              {isAlreadyCheckedIn
                                  ? '현장 출입 중입니다. 퇴근을 원하시면 아래 버튼을 누르세요.'
                                  : '보호구 검사를 진행합니다. 잠시만 기다려주세요.'
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
                          💡 시뮬레이션: 보호구를 클릭하여 착용 상태를 변경하세요
                        </p>
                      </div>
                    </>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            {recognizedWorker && (
                <div className="space-y-3">
                  {/* 출입 중인 작업자 (인식 단계에서 퇴근 처리만 가능) */}
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

                  {/* 보호구 검사 단계 (출입 처리 또는 퇴근(비활성화) 가능) */}
                  {step === 'equipment-check' && (
                      <>
                        {/* 출입 버튼 (모두 착용 시 활성화) */}
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

                        {/* 퇴근 버튼 (이 단계에서는 비활성화하거나 숨김 처리하는 것이 일반적이지만, 시뮬레이션을 위해 비활성화 상태로 유지) */}
                        <Button
                            onClick={handleCheckOutClick}
                            disabled={true}
                            className='w-full h-16 rounded-xl text-base bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
                            style={{ fontWeight: 700 }}
                        >
                          <LogOut className="w-5 h-5 mr-2" />
                          퇴근 (검사 중)
                        </Button>

                        {/* 상태 안내 */}
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

        {/* 챗봇 */}
        <Chatbot />

        {/* 푸터 */}
        <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3">
          <div className="text-center text-gray-500 text-sm font-medium">
            © 2024 endnune safety systems. all rights reserved.
          </div>
        </footer>
      </div>
  );
}