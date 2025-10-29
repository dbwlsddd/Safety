import { useState } from 'react';
import { Worker } from '../types';
import { Plus, Upload, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';

interface WorkerManagementProps {
  workers: Worker[];
  onAddWorker: (worker: Omit<Worker, 'id'>) => void;
  onUpdateWorker: (id: string, worker: Omit<Worker, 'id'>) => void;
  onDeleteWorker: (id: string) => void;
  onBulkUpload: (workers: Omit<Worker, 'id'>[]) => void;
}

export function WorkerManagement({ 
  workers, 
  onAddWorker, 
  onUpdateWorker, 
  onDeleteWorker,
  onBulkUpload 
}: WorkerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({ employeeNumber: '', name: '', team: '' });

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.employeeNumber.includes(searchQuery) ||
    worker.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (formData.employeeNumber && formData.name && formData.team) {
      onAddWorker(formData);
      setFormData({ employeeNumber: '', name: '', team: '' });
      setShowAddDialog(false);
    }
  };

  const handleEdit = () => {
    if (currentWorker && formData.employeeNumber && formData.name && formData.team) {
      onUpdateWorker(currentWorker.id, formData);
      setShowEditDialog(false);
      setCurrentWorker(null);
      setFormData({ employeeNumber: '', name: '', team: '' });
    }
  };

  const handleDelete = () => {
    if (currentWorker) {
      onDeleteWorker(currentWorker.id);
      setShowDeleteDialog(false);
      setCurrentWorker(null);
    }
  };

  const openEditDialog = (worker: Worker) => {
    setCurrentWorker(worker);
    setFormData({
      employeeNumber: worker.employeeNumber,
      name: worker.name,
      team: worker.team,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (worker: Worker) => {
    setCurrentWorker(worker);
    setShowDeleteDialog(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 실제로는 엑셀 파일 파싱이 필요하지만, 프로토타입이므로 더미 데이터 생성
      const dummyWorkers: Omit<Worker, 'id'>[] = [
        { employeeNumber: '2024001', name: '김철수', team: '생산1팀' },
        { employeeNumber: '2024002', name: '이영희', team: '생산2팀' },
        { employeeNumber: '2024003', name: '박지성', team: '품질팀' },
      ];
      onBulkUpload(dummyWorkers);
      setShowBulkUploadDialog(false);
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="text-white mb-2" style={{ fontWeight: 700 }}>
          작업자 관리
        </h2>
        <p className="text-blue-100 text-sm font-medium">작업자 정보를 등록하고 관리합니다</p>
      </div>

      {/* 컨트롤 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="사번, 이름, 소속팀으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-300 font-medium rounded-xl"
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setFormData({ employeeNumber: '', name: '', team: '' });
              setShowAddDialog(true);
            }}
            className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            신규 등록
          </Button>
          <Button
            onClick={() => setShowBulkUploadDialog(true)}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg rounded-xl font-semibold"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">엑셀 일괄 등록</span>
            <span className="sm:hidden">업로드</span>
          </Button>
        </div>
      </div>

      {/* 작업자 테이블 */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700/30 border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">사번</th>
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">이름</th>
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">소속팀</th>
                <th className="px-6 py-4 text-right text-sm text-blue-100 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => (
                <tr key={worker.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-blue-100 font-medium">{worker.employeeNumber}</td>
                  <td className="px-6 py-4 text-sm text-white font-semibold">{worker.name}</td>
                  <td className="px-6 py-4 text-sm text-blue-100 font-medium">{worker.team}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEditDialog(worker)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-cyan-300 hover:text-cyan-200"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(worker)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-blue-200 font-medium">
                    등록된 작업자가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 신규 등록 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontWeight: 700 }}>작업자 신규 등록</DialogTitle>
            <DialogDescription className="text-blue-100 font-medium">
              새로운 작업자 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">사번</Label>
              <Input
                placeholder="사번을 입력하세요"
                value={formData.employeeNumber}
                onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">이름</Label>
              <Input
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">소속팀</Label>
              <Input
                placeholder="소속팀을 입력하세요"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                취소
              </Button>
              <Button
                onClick={handleAdd}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                등록
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">작업자 정보 수정</DialogTitle>
            <DialogDescription className="text-gray-400">
              작업자 정보를 수정하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">사번</Label>
              <Input
                value={formData.employeeNumber}
                onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">이름</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">소속팀</Label>
              <Input
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                취소
              </Button>
              <Button
                onClick={handleEdit}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">작업자 삭제</DialogTitle>
            <DialogDescription className="text-gray-400">
              정말로 이 작업자를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          {currentWorker && (
            <div className="py-4">
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <p className="text-white"><span className="text-gray-400">이름:</span> {currentWorker.name}</p>
                <p className="text-white"><span className="text-gray-400">사번:</span> {currentWorker.employeeNumber}</p>
                <p className="text-white"><span className="text-gray-400">소속팀:</span> {currentWorker.team}</p>
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

      {/* 엑셀 일괄 등록 다이얼로그 */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">엑셀 일괄 등록</DialogTitle>
            <DialogDescription className="text-gray-400">
              엑셀 파일을 업로드하여 여러 작업자를 한번에 등록하세요
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-cyan-500/50 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-white mb-2">파일을 선택하거나 드래그하세요</p>
                <p className="text-gray-500 text-sm">엑셀 파일(.xlsx, .xls)</p>
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-6">
              <Button
                variant="outline"
                onClick={() => setShowBulkUploadDialog(false)}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
