import { useState, useEffect } from 'react';
import { Equipment } from '../types';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';

interface InspectionScreenProps {
  requiredEquipment: Equipment[];
  warningDelaySeconds: number;
  onBack: () => void;
  onPass: () => void;
  onFail: () => void;
}

type InspectionState = 'inspecting' | 'warning' | 'passed' | 'failed';

export function InspectionScreen({
  requiredEquipment,
  warningDelaySeconds,
  onBack,
  onPass,
  onFail,
}: InspectionScreenProps) {
  const [state, setState] = useState<InspectionState>('inspecting');
  const [countdown, setCountdown] = useState(warningDelaySeconds);
  const [detectedEquipment, setDetectedEquipment] = useState<Equipment[]>([]);
  const [missingEquipment, setMissingEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    // 2초 후 검사 시뮬레이션 시작
    const inspectionTimer = setTimeout(() => {
      // 랜덤하게 보호구 감지 (80% 확률)
      const detected = requiredEquipment.filter(() => Math.random() > 0.2);
      setDetectedEquipment(detected);
      
      const missing = requiredEquipment.filter(eq => !detected.includes(eq));
      setMissingEquipment(missing);

      if (missing.length === 0) {
        // 모든 보호구 착용 - 통과
        setState('passed');
      } else {
        // 미착용 발견 - 경고 시작
        setState('warning');
        setCountdown(warningDelaySeconds);
      }
    }, 2000);

    return () => clearTimeout(inspectionTimer);
  }, [requiredEquipment, warningDelaySeconds]);

  useEffect(() => {
    if (state === 'warning') {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // 카운트다운 종료 - 실패
        setState('failed');
      }
    }
  }, [state, countdown]);

  useEffect(() => {
    if (state === 'passed') {
      // 2-3초 후 자동으로 이전 화면으로
      const timer = setTimeout(() => {
        onPass();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state, onPass]);

  const getBorderColor = () => {
    switch (state) {
      case 'inspecting':
        return 'border-cyan-500/50';
      case 'warning':
        return 'border-yellow-500 animate-pulse';
      case 'passed':
        return 'border-green-500';
      case 'failed':
        return 'border-red-500 animate-pulse';
    }
  };

  return (
    <div className="size-full flex flex-col bg-black relative">
      {/* 전체 테두리 효과 */}
      <div className={`absolute inset-0 border-8 ${getBorderColor()} transition-all pointer-events-none`}></div>

      {/* 헤더 */}
      <header className="relative bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white" style={{ fontWeight: 700 }}>보호구 착용 검사</h3>
              <p className="text-gray-400 text-sm font-medium">AI 기반 실시간 검사</p>
            </div>
          </div>
          <Button
            onClick={onBack}
            variant="outline"
            className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-xl font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
        </div>
      </header>

      {/* 웹캠 영역 */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-5xl aspect-video bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-black"></div>

          {/* 코너 프레임 */}
          <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-400"></div>
          <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-400"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-400"></div>
          <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-400"></div>

          {/* 스캔 라인 */}
          {state === 'inspecting' && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-scan"></div>
            </div>
          )}

          {/* 중앙 컨텐츠 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
            {state === 'inspecting' && (
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl text-white mb-2 sm:mb-4">검사 중...</h2>
                <p className="text-sm sm:text-base text-gray-400">보호구 착용 상태를 확인하고 있습니다</p>
                <div className="mt-8 space-y-2">
                  {requiredEquipment.map((eq, idx) => (
                    <div
                      key={eq}
                      className="text-cyan-400 text-sm animate-pulse"
                      style={{ animationDelay: `${idx * 0.2}s` }}
                    >
                      {eq} 감지 중...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state === 'warning' && (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center border-4 border-yellow-500 animate-pulse">
                  <div className="text-6xl">⚠️</div>
                </div>
                <h2 className="text-4xl text-yellow-400 mb-4 animate-pulse">경고</h2>
                <p className="text-2xl text-white mb-6">보호구를 착용하세요</p>
                <div className="text-7xl text-yellow-400 mb-6">{countdown}</div>
                <div className="mt-8 space-y-3">
                  <p className="text-yellow-300">미착용 항목:</p>
                  {missingEquipment.map((eq) => (
                    <div key={eq} className="text-yellow-200 text-lg px-6 py-2 bg-yellow-500/20 rounded-lg inline-block mx-2">
                      {eq}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state === 'passed' && (
              <div className="text-center animate-[fadeIn_0.5s_ease-in]">
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-4 sm:mb-6 bg-green-500/20 rounded-full flex items-center justify-center border-4 border-green-500">
                  <CheckCircle className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 text-green-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl text-green-400 mb-2 sm:mb-4">검사 통과</h2>
                <p className="text-base sm:text-lg lg:text-xl text-white mb-4 sm:mb-6">모든 필수 보호구가 확인되었습니다</p>
                <div className="text-green-300 text-lg">
                  {new Date().toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  {new Date().toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  통과
                </div>
              </div>
            )}

            {state === 'failed' && (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500 animate-pulse">
                  <XCircle className="w-20 h-20 text-red-400" />
                </div>
                <h2 className="text-5xl text-red-400 mb-4">검사 실패</h2>
                <p className="text-xl text-white mb-6">필수 보호구 미착용이 확인되었습니다</p>
                <div className="mt-8 space-y-3">
                  <p className="text-red-300">미착용 항목:</p>
                  {missingEquipment.map((eq) => (
                    <div key={eq} className="text-red-200 text-lg px-6 py-2 bg-red-500/20 rounded-lg inline-block mx-2">
                      {eq}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 상태 배지 */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900/80 backdrop-blur-sm border rounded-full">
            {state === 'inspecting' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-cyan-400">AI 분석 중</span>
              </div>
            )}
            {state === 'warning' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-400">경고 발생</span>
              </div>
            )}
            {state === 'passed' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400">검사 통과</span>
              </div>
            )}
            {state === 'failed' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-red-400">검사 실패</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 정보 패널 */}
      <div className="relative bg-slate-900/80 backdrop-blur-md border-t border-slate-800 px-8 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex gap-8">
            <div>
              <p className="text-gray-400 text-sm mb-1">필수 보호구</p>
              <p className="text-white">{requiredEquipment.length}개</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">감지된 보호구</p>
              <p className="text-green-400">{detectedEquipment.length}개</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">미착용 보호구</p>
              <p className="text-red-400">{missingEquipment.length}개</p>
            </div>
          </div>
          <div className="text-gray-500 text-sm">
            © 2024 endnune safety systems. all rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
