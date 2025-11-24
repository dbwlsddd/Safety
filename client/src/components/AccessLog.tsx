import { useState } from 'react';
import { AccessLogEntry } from '../types';
import { Search, Trash2, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface AccessLogProps {
  logs: AccessLogEntry[];
  onDeleteLog: (id: string) => void;
}

export function AccessLog({ logs, onDeleteLog }: AccessLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentLog, setCurrentLog] = useState<AccessLogEntry | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.workerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.timestamp);
      if (startDate) {
        const start = new Date(startDate);
        matchesDate = matchesDate && logDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= end;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  const openDeleteDialog = (log: AccessLogEntry) => {
    setCurrentLog(log);
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (currentLog) {
      onDeleteLog(currentLog.id);
      setShowDeleteDialog(false);
      setCurrentLog(null);
    }
  };

  const getStatusIcon = (status: AccessLogEntry['status']) => {
    switch (status) {
      case '성공':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case '실패':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case '경고':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: AccessLogEntry['status']) => {
    switch (status) {
      case '성공':
        return 'text-green-400';
      case '실패':
        return 'text-red-400';
      case '경고':
        return 'text-yellow-400';
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
          출입/검사 로그
        </h2>
        <p className="text-gray-400 text-sm">작업자의 출입 및 검사 기록을 확인합니다</p>
      </div>

      {/* 필터링 영역 */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="작업자 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Calendar className="hidden sm:block w-4 h-4 text-gray-500" />
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white flex-1"
              />
              <span className="text-gray-500">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white flex-1"
              />
            </div>
            <Button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
              }}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 w-full sm:w-auto"
            >
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm text-gray-400">시간</th>
                <th className="px-6 py-4 text-left text-sm text-gray-400">작업자명</th>
                <th className="px-6 py-4 text-left text-sm text-gray-400">활동</th>
                <th className="px-6 py-4 text-left text-sm text-gray-400">상태</th>
                <th className="px-6 py-4 text-left text-sm text-gray-400">상세내용</th>
                <th className="px-6 py-4 text-right text-sm text-gray-400">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(log.timestamp).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{log.workerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{log.activity}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={getStatusColor(log.status)}>{log.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openDeleteDialog(log)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    검색 결과가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">로그 삭제</DialogTitle>
            <DialogDescription className="text-gray-400">
              정말로 이 로그를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          {currentLog && (
            <div className="py-4">
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <p className="text-white">
                  <span className="text-gray-400">시간:</span>{' '}
                  {new Date(currentLog.timestamp).toLocaleString('ko-KR')}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">작업자:</span> {currentLog.workerName}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">활동:</span> {currentLog.activity}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">상태:</span>{' '}
                  <span className={getStatusColor(currentLog.status)}>{currentLog.status}</span>
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  취소
                </Button>
                <Button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  삭제
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
