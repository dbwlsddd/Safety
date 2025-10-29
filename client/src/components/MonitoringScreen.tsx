import { useState, useEffect } from 'react';
import { Equipment } from '../App';
import { AlertTriangle, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { Chatbot } from './Chatbot';

interface MonitoringScreenProps {
  requiredEquipment: Equipment[];
  onBack: () => void;
}

export function MonitoringScreen({ requiredEquipment, onBack }: MonitoringScreenProps) {
  const [detectedEquipment, setDetectedEquipment] = useState<Equipment[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [missingEquipment, setMissingEquipment] = useState<Equipment[]>([]);

  // AI 감지 시뮬레이션
  useEffect(() => {
    const simulateDetection = () => {
      // 랜덤하게 보호구 감지 시뮬레이션
      const detected: Equipment[] = requiredEquipment.filter(() => Math.random() > 0.3);
      setDetectedEquipment(detected);

      // 미착용 보호구 확인
      const missing = requiredEquipment.filter(eq => !detected.includes(eq));
      setMissingEquipment(missing);
      setShowWarning(missing.length > 0);
    };

    // 3초마다 감지 시뮬레이션
    const interval = setInterval(simulateDetection, 3000);
    simulateDetection(); // 즉시 한 번 실행

    return () => clearInterval(interval);
  }, [requiredEquipment]);

  return (
    <div className="size-full flex flex-col">
      {/* 헤더 */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-cyan-400">산업 현장 보호구 착용 모니터링 시스템</h3>
              <p className="text-gray-400 text-sm">AI 기반 안전 관리 솔루션</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">설정 변경</span>
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* 좌측: 비디오 피드 */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h2 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              실시간 모니터링
            </h2>
            <p className="text-gray-400 text-sm mt-1">AI 비전 기술을 통한 보호구 착용 감지</p>
          </div>

          {/* 비디오 영역 */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">
            {/* 카메라 프레임 */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-black"></div>
            
            {/* 코너 프레임 */}
            <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-cyan-400"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-cyan-400"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-cyan-400"></div>

            {/* 스캔 라인 애니메이션 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-scan"></div>
            </div>

            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-gray-500">카메라 피드 영역</p>
                <p className="text-gray-600 text-sm mt-2">AI 보호구 감지 시스템 대기 중</p>
              </div>
            </div>

            {/* 상태 배지 */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-cyan-400">시스템 활성화</span>
            </div>
          </div>
        </div>

        {/* 우측: 인식 결과 */}
        <div className="w-96 flex flex-col gap-4">
          {/* 인식 결과 카드 */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 flex-1 overflow-auto border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-cyan-500/30">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                인식 결과
              </h3>
            </div>
            
            {/* 필수 보호구 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">필수 보호구</span>
                <span className="px-2 py-1 bg-slate-800 rounded-full text-xs text-cyan-400">
                  {requiredEquipment.length}개
                </span>
              </div>
              <div className="space-y-2">
                {requiredEquipment.map((equipment) => (
                  <div 
                    key={equipment} 
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">{equipment}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 감지된 보호구 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">감지된 보호구</span>
                <span className="px-2 py-1 bg-green-900/30 rounded-full text-xs text-green-400">
                  {detectedEquipment.length}개
                </span>
              </div>
              <div className="space-y-2">
                {detectedEquipment.length > 0 ? (
                  detectedEquipment.map((equipment) => (
                    <div 
                      key={equipment} 
                      className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg border border-green-500/30"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300">{equipment}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm px-3 py-2">감지된 보호구 없음</div>
                )}
              </div>
            </div>

            {/* 미착용 보호구 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">미착용 보호구</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  missingEquipment.length > 0 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  {missingEquipment.length}개
                </span>
              </div>
              <div className="space-y-2">
                {missingEquipment.length > 0 ? (
                  missingEquipment.map((equipment) => (
                    <div 
                      key={equipment} 
                      className="flex items-center gap-2 px-3 py-2 bg-red-900/20 rounded-lg border border-red-500/30"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-300">{equipment}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg border border-green-500/30">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">모든 보호구 착용 완료</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 경고 알림 */}
          {showWarning && missingEquipment.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 backdrop-blur-sm shadow-lg shadow-red-500/10 rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="mb-2">⚠️ 경고</div>
                  <div className="text-sm">필수 보호구가 미착용 상태입니다!</div>
                  <div className="mt-3 text-sm">
                    <div className="text-red-300">미착용 항목:</div>
                    <div className="mt-1 text-red-200">{missingEquipment.join(', ')}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-red-500/20 text-xs text-red-300/80">
                    관련 법규: 산업안전보건법 제49조, 제138조 및 제140조에 따른 
                    안전보건규칙을 준수하여 사업장 내 적절한 작업복 착용을 
                    의무로 규정하고 있습니다.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 챗봇 */}
      <Chatbot />

      {/* 푸터 */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800 px-6 py-3">
        <div className="text-center text-gray-500 text-sm">
          © 2024 endnune safety systems. all rights reserved.
        </div>
      </footer>
    </div>
  );
}