import { AccessLogEntry } from '../types';
import { TrendingUp, TrendingDown, Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardProps {
  logs: AccessLogEntry[];
}

export default function Dashboard({ logs }: DashboardProps) {
  // 통계 계산
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  const successCount = todayLogs.filter(log => log.status === '성공').length;
  const warningCount = todayLogs.filter(log => log.status === '경고').length;
  const failCount = todayLogs.filter(log => log.status === '실패').length;

  const checkInCount = todayLogs.filter(log => log.activity === '출입').length;
  const checkOutCount = todayLogs.filter(log => log.activity === '퇴근').length;
  const inspectionCount = todayLogs.filter(log => log.activity === '검사').length;

  const successRate = todayLogs.length > 0 ? ((successCount / todayLogs.length) * 100).toFixed(1) : '0';

  // 최근 활동
  const recentLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 5);

  const getStatusColor = (status: AccessLogEntry['status']) => {
    switch (status) {
      case '성공': return 'text-green-400';
      case '실패': return 'text-red-400';
      case '경고': return 'text-yellow-400';
    }
  };

  const getStatusBg = (status: AccessLogEntry['status']) => {
    switch (status) {
      case '성공': return 'bg-green-500/10 border-green-500/20';
      case '실패': return 'bg-red-500/10 border-red-500/20';
      case '경고': return 'bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="text-white mb-2" style={{ fontWeight: 700 }}>
          대시보드
        </h2>
        <p className="text-gray-400 text-sm font-medium">실시간 현장 안전 모니터링</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* 오늘 총 활동 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div className="px-2 py-1 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>{todayLogs.length}</div>
            <div className="text-gray-400 text-sm font-medium">오늘 총 활동</div>
          </div>
        </div>

        {/* 성공률 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-green-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="px-2 py-1 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>{successRate}%</div>
            <div className="text-gray-400 text-sm font-medium">검사 성공률</div>
          </div>
        </div>

        {/* 출입 인원 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="px-2 py-1 bg-cyan-500/10 rounded-lg">
              <span className="text-xs text-cyan-400 font-semibold">TODAY</span>
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>{checkInCount}</div>
            <div className="text-gray-400 text-sm font-medium">출입 인원</div>
          </div>
        </div>

        {/* 경고/실패 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-yellow-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="px-2 py-1 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>{warningCount + failCount}</div>
            <div className="text-gray-400 text-sm font-medium">경고 및 실패</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 활동 유형별 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
          <h3 className="text-white mb-6" style={{ fontWeight: 700 }}>활동 유형별</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">출입</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{checkInCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">퇴근</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{checkOutCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">검사</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{inspectionCount}</span>
            </div>
          </div>
        </div>

        {/* 상태별 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
          <h3 className="text-white mb-6" style={{ fontWeight: 700 }}>상태별</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">성공</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{successCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">경고</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{warningCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300 font-medium">실패</span>
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>{failCount}</span>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
          <h3 className="text-white mb-6" style={{ fontWeight: 700 }}>최근 활동</h3>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded-lg border text-xs font-semibold ${getStatusBg(log.status)} ${getStatusColor(log.status)}`}>
                  {log.status}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{log.workerName}</div>
                  <div className="text-gray-500 text-xs">{log.activity}</div>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">
                활동 기록이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
