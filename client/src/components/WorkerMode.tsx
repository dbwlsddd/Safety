import { useState } from 'react';
import { Worker } from '../types';
import { Camera, LogIn, LogOut, Search, ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Chatbot } from './Chatbot';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';

interface WorkerModeProps {
  workers: Worker[];
  inspectionPassed: boolean;
  onStartInspection: (workerId: string) => void;
  onCheckIn: (workerId: string) => void;
  onCheckOut: (workerId: string) => void;
  onBack: () => void;
}

export function WorkerMode({
  workers,
  inspectionPassed,
  onStartInspection,
  onCheckIn,
  onCheckOut,
  onBack,
}: WorkerModeProps) {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartInspection = () => {
    if (selectedWorker) {
      onStartInspection(selectedWorker.id);
    }
  };

  const handleCheckIn = () => {
    if (selectedWorker) {
      onCheckIn(selectedWorker.id);
    }
  };

  const handleCheckOut = () => {
    if (selectedWorker) {
      onCheckOut(selectedWorker.id);
    }
  };

  // 검색 필터링
  const filteredWorkers = workers.filter((worker) => {
    const query = searchQuery.toLowerCase();
    return (
      worker.name.toLowerCase().includes(query) ||
      worker.employeeNumber.toLowerCase().includes(query) ||
      worker.team.toLowerCase().includes(query)
    );
  });

  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setOpen(false);
    setSearchQuery('');
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
          <Button
            onClick={onBack}
            variant="outline"
            className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-xl font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            메인 화면
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* 안내 문구 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 text-sm font-medium">안전 출입 절차</span>
            </div>
            <h1 className="text-5xl text-white mb-4" style={{ fontWeight: 700 }}>산업 현장 출입 시스템</h1>
            <p className="text-gray-400 text-lg font-medium">
              본인 확인 및 보호구 검사를 진행해주세요
            </p>
          </div>

          {/* 작업자 선택 */}
          <div className="mb-8">
            <label className="text-white mb-3 block font-semibold">작업자 선택</label>
            <Popover open={open} onOpenChange={setOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-14 bg-slate-900 border-slate-800 text-white hover:bg-slate-800 hover:text-white rounded-xl font-medium"
                >
                  {selectedWorker ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                        {selectedWorker.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div>{selectedWorker.name}</div>
                        <div className="text-xs text-gray-400">
                          {selectedWorker.employeeNumber} · {selectedWorker.team}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">작업자 이름을 검색하거나 선택하세요</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-full p-0 bg-slate-900 border-slate-800 shadow-2xl" 
                style={{ width: 'var(--radix-popover-trigger-width)' }} 
                align="start"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector('input');
                  if (input) {
                    setTimeout(() => input.focus(), 0);
                  }
                }}
              >
                <div className="flex flex-col">
                  {/* 검색 입력 */}
                  <div className="p-3 border-b border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        placeholder="작업자 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  
                  {/* 작업자 목록 */}
                  <div className="max-h-64 overflow-auto p-2">
                    {filteredWorkers.length === 0 ? (
                      <div className="text-gray-400 py-6 text-center text-sm">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredWorkers.map((worker) => (
                        <button
                          key={worker.id}
                          onClick={() => handleSelectWorker(worker)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {worker.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-semibold">{worker.name}</div>
                            <div className="text-xs text-gray-400 font-medium">
                              {worker.employeeNumber} · {worker.team}
                            </div>
                          </div>
                          {selectedWorker?.id === worker.id && (
                            <Check className="w-4 h-4 text-blue-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 액션 버튼들 */}
          <div className="space-y-4">
            {/* 보호구 착용 검사 시작 버튼 */}
            <Button
              onClick={handleStartInspection}
              disabled={!selectedWorker}
              className={`w-full h-16 sm:h-20 text-base sm:text-lg rounded-2xl ${
                selectedWorker
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-2xl shadow-blue-500/30 font-bold'
                  : 'bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              보호구 착용 검사 시작
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 출입 기록 버튼 */}
              <Button
                onClick={handleCheckIn}
                disabled={!selectedWorker || !inspectionPassed}
                className={`h-14 sm:h-16 rounded-2xl text-sm sm:text-base ${
                  selectedWorker && inspectionPassed
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl shadow-green-500/30 font-bold'
                    : 'bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                출입 기록
              </Button>

              {/* 퇴근 기록 버튼 */}
              <Button
                onClick={handleCheckOut}
                disabled={!selectedWorker}
                className={`h-14 sm:h-16 rounded-2xl text-sm sm:text-base ${
                  selectedWorker
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/30 font-bold'
                    : 'bg-slate-900 text-gray-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                퇴근 기록
              </Button>
            </div>
          </div>

          {/* 상태 안내 */}
          {selectedWorker && !inspectionPassed && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <p className="text-yellow-400 text-sm text-center font-semibold">
                ⚠️ 출입하려면 먼저 보호구 착용 검사를 통과해야 합니다
              </p>
            </div>
          )}

          {selectedWorker && inspectionPassed && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
              <p className="text-green-400 text-sm text-center font-semibold">
                ✓ 검사 통과 완료 - 출입이 가능합니다
              </p>
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
