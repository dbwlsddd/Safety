import { useState } from 'react';
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

  // 얼굴 인식 시뮬레이션 (랜덤하게 작업자 선택)
  const handleFaceRecognition = () => {
    // 인식 시뮬레이션
    const randomWorker = workers[Math.floor(Math.random() * workers.length)];
    setRecognizedWorker(randomWorker);

    // AI 코드의 핵심 로직: 현재 출입 상태 확인
    const alreadyCheckedIn = checkedInWorkerIds.has(randomWorker.id);
    setIsAlreadyCheckedIn(alreadyCheckedIn);

    if (alreadyCheckedIn) {
      // 출입 중인 경우: 퇴근 대기 모드 (step은 face-recognition 유지)
      // 별도의 추가 액션 없이 상태만 업데이트하여 UI에 반영
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
          <div className="flex-1 lg:w-3/4 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[300px]">
            {/* Mock 웹캠 화면 */}
            <div className="absolute inset-0 bg-slate-900">
              {/* 그리드 패턴 */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}></div>

              {/* 중앙 가이드 */}
              <div className="absolute inset-0 flex items-center justify-center">
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

              {/* 스캔 효과 */}
              {step === 'face-recognition' && !recognizedWorker && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse" style={{ animation: 'scan 2s infinite linear' }}></div>
                  </div>
              )}

              {/* 인식 완료 오버레이 */}
              {recognizedWorker && step === 'face-recognition' && (
                  <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-500">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-green-500/50">
                        <UserCheck className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-green-400 text-2xl font-semibold">얼굴 인식 완료</p>
                    </div>
                  </div>
              )}

              {/* Custom Keyframes for scanning animation */}
              <style jsx>{`
              @keyframes scan {
                0% { transform: translateY(-100%) }
                50% { transform: translateY(100%) }
                100% { transform: translateY(-100%) }
              }
            `}</style>
            </div>

            {/* 하단 안내 */}
            <div className="absolute bottom-6 left-6 right-6 bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm text-center font-medium">
                인식을 시작하려면 오른쪽의 "얼굴 인식 시작" 버튼을 클릭하세요
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

                      {!recognizedWorker && (
                          <Button
                              onClick={handleFaceRecognition}
                              className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 rounded-xl"
                              style={{ fontWeight: 700 }}
                          >
                            <UserCheck className="w-5 h-5 mr-2" />
                            얼굴 인식 시작
                          </Button>
                      )}
                      {/* 인식 후 상태 메시지 (출입/퇴근 버튼 활성화는 하단 액션 버튼 영역에서 처리) */}
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