import { useState, useEffect } from 'react';
import { Equipment, SystemConfig } from '../types';
// ✅ Lock을 LockIcon으로 이름을 바꿔서 import (충돌 방지)
import { Wind, Shield, HardHat, Glasses, Shirt, Footprints, Anchor, Activity, ShieldCheck, Save, Lock as LockIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Input } from './ui/input';

interface SystemSettingsProps {
  config: SystemConfig;
  onSaveConfig: (config: SystemConfig) => void;
}

interface EquipmentOption {
  name: Equipment;
  icon: React.ComponentType<{ className?: string }>;
}

const equipmentOptions: EquipmentOption[] = [
  { name: '방독 마스크', icon: Wind },
  { name: '방진 마스크', icon: Wind },
  { name: '일반 마스크', icon: Activity },
  { name: '페이스 쉴드', icon: Shield },
  { name: '헬멧', icon: HardHat },
  { name: '방호복', icon: ShieldCheck },
  { name: '보호경', icon: Glasses },
  { name: '조끼', icon: Shirt },
  { name: '작업화', icon: Footprints },
  { name: '하네스', icon: Anchor },
];

export function SystemSettings({ config, onSaveConfig }: SystemSettingsProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>(config.requiredEquipment);
  const [warningDelay, setWarningDelay] = useState(config.warningDelaySeconds);
  const [adminPassword, setAdminPassword] = useState(config.adminPassword || '1234');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const hasEquipmentChanges =
        selectedEquipment.length !== config.requiredEquipment.length ||
        selectedEquipment.some(eq => !config.requiredEquipment.includes(eq));
    const hasDelayChanges = warningDelay !== config.warningDelaySeconds;
    const hasPasswordChanges = adminPassword !== (config.adminPassword || '1234');

    setHasChanges(hasEquipmentChanges || hasDelayChanges || hasPasswordChanges);
  }, [selectedEquipment, warningDelay, adminPassword, config]);

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
        prev.includes(equipment)
            ? prev.filter(e => e !== equipment)
            : [...prev, equipment]
    );
  };

  const handleSave = () => {
    onSaveConfig({
      requiredEquipment: selectedEquipment,
      warningDelaySeconds: warningDelay,
      adminPassword: adminPassword,
    });
    setHasChanges(false);
    alert("설정이 저장되었습니다.");
  };

  return (
      <div>
        {/* 헤더 */}
        <div className="mb-8">
          <h2 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            시스템 설정
          </h2>
          <p className="text-gray-400 text-sm">안전 관리 시스템의 설정을 관리합니다</p>
        </div>

        <div className="space-y-6">
          {/* 1. 필수 보호구 설정 */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-white mb-2">필수 보호구 설정</h3>
              <p className="text-gray-400 text-sm">
                현장에서 착용이 필요한 보호구를 선택하세요
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {equipmentOptions.map(({ name, icon: Icon }) => (
                  <button
                      key={name}
                      onClick={() => toggleEquipment(name)}
                      className={`group relative h-32 rounded-xl transition-all duration-300 ${
                          selectedEquipment.includes(name)
                              ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/50 scale-105'
                              : 'bg-slate-800/50 hover:bg-slate-800 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 hover:scale-105'
                      }`}
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative h-full flex flex-col items-center justify-center gap-3 px-2">
                      <Icon
                          className={`w-8 h-8 ${
                              selectedEquipment.includes(name)
                                  ? 'text-white'
                                  : 'text-cyan-400'
                          }`}
                      />
                      <span
                          className={`text-sm text-center ${
                              selectedEquipment.includes(name)
                                  ? 'text-white'
                                  : 'text-gray-300'
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
            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-cyan-400 text-sm">
                선택된 보호구: <span className="font-bold">{selectedEquipment.length}개</span>
              </p>
            </div>
          </div>

          {/* 2. 경고 시스템 설정 */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-white mb-2">경고 시스템 설정</h3>
              <p className="text-gray-400 text-sm">
                보호구 미착용 감지 시 경고 유예 시간을 설정합니다
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-white text-sm">경고 유예 시간 (초)</label>
                  <div className="flex items-center gap-4">
                    <Input
                        type="number"
                        min="0"
                        max="60"
                        value={warningDelay}
                        onChange={(e) => setWarningDelay(Number(e.target.value))}
                        className="w-20 bg-slate-800 border-slate-700 text-white text-center"
                    />
                    <span className="text-gray-400 text-sm">초</span>
                  </div>
                </div>
                <Slider
                    value={[warningDelay]}
                    onValueChange={(value) => setWarningDelay(value[0])}
                    min={0}
                    max={60}
                    step={1}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0초</span>
                  <span>30초</span>
                  <span>60초</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 관리자 보안 설정 */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                {/* ✅ 여기서 Lock 대신 LockIcon 사용 */}
                <LockIcon className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-white mb-2">관리자 보안 설정</h3>
                <p className="text-gray-400 text-sm">
                  관리자 모드 진입을 위한 비밀번호를 설정합니다
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-white text-sm">새 비밀번호</label>
                <Input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="변경할 비밀번호 입력"
                    className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ 비밀번호 분실 시 관리자 모드에 접근할 수 없습니다. 주의하세요.
                </p>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end pt-4">
            <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`w-full sm:w-auto px-8 py-6 text-lg transition-all duration-300 ${
                    hasChanges
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Save className="w-5 h-5 mr-2" />
              설정 저장하기
            </Button>
          </div>
        </div>
      </div>
  );
}