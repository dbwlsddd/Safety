import { useState } from "react";
import { Equipment } from "../App";
import {
  Wind,
  Shield,
  HardHat,
  Glasses,
  Shirt,
  Footprints,
  Anchor,
  Activity,
  ShieldCheck,
} from "lucide-react";

interface EquipmentSelectionProps {
  onStartMonitoring: (equipment: Equipment[]) => void;
}

interface EquipmentOption {
  name: Equipment;
  icon: React.ComponentType<{ className?: string }>;
}

const equipmentOptions: EquipmentOption[] = [
  { name: "방독 마스크", icon: Wind },
  { name: "방진 마스크", icon: Wind },
  { name: "일반 마스크", icon: Activity },
  { name: "페이스 쉴드", icon: Shield },
  { name: "헬멧", icon: HardHat },
  { name: "방호복", icon: ShieldCheck },
  { name: "보호경", icon: Glasses },
  { name: "조끼", icon: Shirt },
  { name: "작업화", icon: Footprints },
  { name: "하네스", icon: Anchor },
];

export function EquipmentSelection({
  onStartMonitoring,
}: EquipmentSelectionProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<
    Equipment[]
  >([]);

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((e) => e !== equipment)
        : [...prev, equipment],
    );
  };

  const handleStartMonitoring = () => {
    if (selectedEquipment.length > 0) {
      onStartMonitoring(selectedEquipment);
    }
  };

  return (
    <div className="size-full flex flex-col items-center justify-center px-8 py-12">
      <div className="w-full max-w-5xl">
        {/* 헤더 */}
        <div className="text-center mb-16">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-400 text-sm">
              시스템 설정
            </span> 
          </div> */}
          <h1 className="text-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4 tracking-tight font-bold">
            산업 현장 보호구 착용 모니터링 시스템
          </h1>
          <p className="text-gray-400">
            AI 기반 안전 관리 솔루션
          </p>
        </div>

        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent font-bold">
              필수 보호구 설정
            </h2>
            <p className="text-gray-400 text-sm">
              현장에 필요한 보호구를 모두 선택해주세요
            </p>
          </div>

          {/* 보호구 선택 그리드 */}
          <div className="grid grid-cols-5 gap-4 mb-10">
            {equipmentOptions.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => toggleEquipment(name)}
                className={`group relative h-28 rounded-xl transition-all duration-300 ${
                  selectedEquipment.includes(name)
                    ? "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/50 scale-105"
                    : "bg-slate-800/50 hover:bg-slate-800 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 hover:scale-105"
                }`}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative h-full flex flex-col items-center justify-center gap-2 px-2">
                  <Icon
                    className={`w-8 h-8 ${
                      selectedEquipment.includes(name)
                        ? "text-white"
                        : "text-cyan-400"
                    }`}
                  />
                  <span
                    className={`text-sm text-center ${
                      selectedEquipment.includes(name)
                        ? "text-white"
                        : "text-gray-300"
                    }`}
                  >
                    {name}
                  </span>
                </div>
                {selectedEquipment.includes(name) && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* 시작 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={handleStartMonitoring}
              disabled={selectedEquipment.length === 0}
              className={`group relative px-10 py-4 rounded-xl transition-all duration-300 ${
                selectedEquipment.length > 0
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 cursor-pointer"
                  : "bg-slate-800/50 text-gray-500 cursor-not-allowed border border-slate-700/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-white">
                  모니터링 시작
                </span>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedEquipment.length > 0
                      ? "bg-white/20"
                      : "bg-slate-700/50"
                  }`}
                >
                  {selectedEquipment.length}개 선택됨
                </div>
              </div>
              {selectedEquipment.length > 0 && (
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
            </button>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center text-gray-500 text-sm mt-20">
          <p>
            © 2024 endnune safety systems. all rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}