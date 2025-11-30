import { Shield, Users, ArrowRight, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';

interface ModeSelectionProps {
  onSelectMode: (mode: 'admin' | 'worker') => void;
  adminPassword?: string;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = () => {
    // ✅ 하드코딩된 '1234'를 prop으로 받은 adminPassword로 변경
    if (password === adminPassword) {
      setShowPasswordDialog(false);
      onSelectMode('admin');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAdminClick = () => {
    setShowPasswordDialog(true);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = () => {
    if (password === '1234') {
      setShowPasswordDialog(false);
      onSelectMode('admin');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleWorkerClick = () => {
    onSelectMode('worker');
  };

  return (
    <div className="size-full relative bg-black overflow-hidden">
      {/* 배경 그라디언트 효과 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* 그리드 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="relative z-10 size-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          {/* 헤더 */}
          <div className="text-center mb-12 lg:mb-20">
            {/* 로고/아이콘 */}
            {/*<div className="inline-flex items-center justify-center mb-6 lg:mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 animate-pulse"></div>
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 rotate-6 hover:rotate-0 transition-transform duration-500">
                  <Zap className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>*/}

            <div className={"h-16"}></div>

            {/* 타이틀 */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl mb-4 lg:mb-6 tracking-tight" style={{ fontWeight: 800 }}>
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Safety
              </span>
              {/*<br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                출입 시스템
              </span>*/}
            </h1>

            <div className="flex items-center justify-center gap-2 lg:gap-3 mb-4 lg:mb-6">
              <div className="h-px w-8 lg:w-12 bg-gradient-to-r from-transparent to-blue-500"></div>
              <p className="text-gray-400 text-sm lg:text-lg font-medium tracking-wide">AI POWERED SAFETY SOLUTION</p>
              <div className="h-px w-8 lg:w-12 bg-gradient-to-l from-transparent to-blue-500"></div>
            </div>

            <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed px-4">
              산업 현장의 안전을 위한 지능형 출입 관리 시스템
            </p>
          </div>

          {/* 모드 선택 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto px-4">
            {/* 관리자 모드 */}
            <button
              onClick={handleAdminClick}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20"
            >
              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all duration-500"></div>

              {/* 광선 효과 */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500"></div>

              <div className="relative">
                {/* 아이콘 */}
                <div className="mb-6 lg:mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 group-hover:scale-110 transition-all duration-500">
                    <Shield className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* 텍스트 */}
                <div className="text-left mb-4 lg:mb-6">
                  <h3 className="text-2xl lg:text-3xl text-white mb-2 lg:mb-3 group-hover:text-blue-300 transition-colors" style={{ fontWeight: 700 }}>
                    관리자 모드
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-medium">
                    시스템 설정 및 작업자 관리,<br />
                    출입 기록 확인 및 대시보드
                  </p>
                </div>

                {/* 화살표 */}
                <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span className="text-xs sm:text-sm font-semibold">접속하기</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 코너 장식 */}
              <div className="absolute top-3 right-3 lg:top-4 lg:right-4 w-6 h-6 lg:w-8 lg:h-8 border-t-2 border-r-2 border-blue-500/20 group-hover:border-blue-500/50 transition-colors"></div>
              <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 w-6 h-6 lg:w-8 lg:h-8 border-b-2 border-l-2 border-blue-500/20 group-hover:border-blue-500/50 transition-colors"></div>
            </button>

            {/* 작업자 모드 */}
            <button
              onClick={handleWorkerClick}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20"
            >
              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-500"></div>

              {/* 광선 효과 */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-500"></div>

              <div className="relative">
                {/* 아이콘 */}
                <div className="mb-6 lg:mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl lg:rounded-2xl shadow-lg shadow-cyan-500/50 group-hover:shadow-cyan-500/70 group-hover:scale-110 transition-all duration-500">
                    <Users className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* 텍스트 */}
                <div className="text-left mb-4 lg:mb-6">
                  <h3 className="text-2xl lg:text-3xl text-white mb-2 lg:mb-3 group-hover:text-cyan-300 transition-colors" style={{ fontWeight: 700 }}>
                    작업자 모드
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-medium">
                    본인 확인 및 보호구 검사,<br />
                    출입 및 퇴근 기록 관리
                  </p>
                </div>

                {/* 화살표 */}
                <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <span className="text-xs sm:text-sm font-semibold">접속하기</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 코너 장식 */}
              <div className="absolute top-3 right-3 lg:top-4 lg:right-4 w-6 h-6 lg:w-8 lg:h-8 border-t-2 border-r-2 border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors"></div>
              <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 w-6 h-6 lg:w-8 lg:h-8 border-b-2 border-l-2 border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors"></div>
            </button>
          </div>

          {/* 푸터 */}
          <div className="text-center mt-12 lg:mt-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-900/50 border border-slate-800 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-500 text-xs font-medium tracking-wider">SYSTEM ONLINE</span>
            </div>
            <p className="text-gray-600 text-xs mt-3 lg:mt-4 px-4">© 2024 endnune safety systems. all rights reserved.</p>
          </div>
        </div>
      </div>

      {/* 비밀번호 다이얼로그 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-950 border-slate-800 shadow-2xl mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-white text-lg sm:text-xl" style={{ fontWeight: 700 }}>
              관리자 인증
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-medium text-sm">
              관리자 비밀번호를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className="bg-slate-900 border-slate-800 text-white placeholder:text-gray-500 font-medium h-11 sm:h-12 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
            />
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
            <div className="flex gap-2 sm:gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="bg-slate-900 border-slate-800 text-gray-300 hover:bg-slate-800 hover:text-white font-semibold rounded-xl text-sm"
              >
                취소
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 rounded-xl text-sm"
              >
                확인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
