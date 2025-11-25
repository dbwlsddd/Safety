import { useState } from 'react';
import { Worker } from '../types';
import { Plus, Upload, Pencil, Trash2, Search, FileSpreadsheet, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import * as XLSX from 'xlsx';

// 🛠️ 타입 정의 확장 (파일 포함)
export interface WorkerFormData extends Omit<Worker, 'id'> {
  photoFile?: File | null;
}

interface WorkerManagementProps {
  workers: Worker[];
  onAddWorker: (worker: WorkerFormData) => void;
  onUpdateWorker: (id: string, worker: WorkerFormData) => void;
  onDeleteWorker: (id: string) => void;
  onBulkUpload: (workers: any[]) => void;
}

export function WorkerManagement({
                                   workers,
                                   onAddWorker,
                                   onUpdateWorker,
                                   onDeleteWorker,
                                   onBulkUpload
                                 }: WorkerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 모달 상태
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);

  // 데이터 상태
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);

  // 🛠️ photoFile 상태 추가
  const [formData, setFormData] = useState<WorkerFormData>({
    employeeNumber: '',
    name: '',
    team: '',
    photoFile: null
  });

  // 🛠️ 일괄 등록용 상태
  const [bulkStep, setBulkStep] = useState<1 | 2>(1); // 1: 파일선택, 2: 매칭확인
  const [excelData, setExcelData] = useState<any[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [matchMap, setMatchMap] = useState<{[key: string]: File | null}>({});

  const filteredWorkers = workers.filter(worker =>
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.employeeNumber.includes(searchQuery) ||
      worker.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🛠️ 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, photoFile: e.target.files![0] }));
    }
  };

  // 개별 등록
  const handleAdd = () => {
    if (formData.employeeNumber && formData.name && formData.team) {
      onAddWorker(formData);
      setFormData({ employeeNumber: '', name: '', team: '', photoFile: null });
      setShowAddDialog(false);
    }
  };

  // 개별 수정
  const handleEdit = () => {
    if (currentWorker && formData.employeeNumber && formData.name && formData.team) {
      onUpdateWorker(currentWorker.id, formData);
      setShowEditDialog(false);
      setCurrentWorker(null);
      setFormData({ employeeNumber: '', name: '', team: '', photoFile: null });
    }
  };

  // 삭제
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
      photoFile: null // 수정 시 파일은 초기화 (새로 올릴 때만 설정)
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (worker: Worker) => {
    setCurrentWorker(worker);
    setShowDeleteDialog(true);
  };

  // 🛠️ 엑셀 파일 파싱
  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setExcelData(jsonData);
    }
  };

  // 🛠️ 사진 파일 로드 및 자동 매칭
  const handlePhotoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedPhotos(files);

      // 자동 매칭 로직: 이름이 파일명에 포함되면 매칭
      const newMatchMap: {[key: string]: File | null} = {};
      excelData.forEach((row, idx) => {
        const workerName = row['이름'] || row['name'] || '';
        if (workerName) {
          const matchedFile = files.find(f => f.name.includes(workerName));
          newMatchMap[idx] = matchedFile || null;
        } else {
          newMatchMap[idx] = null;
        }
      });
      setMatchMap(newMatchMap);
    }
  };

  // 🛠️ 사용되지 않은 사진 필터링 (소거법)
  const getUnusedPhotos = () => {
    const usedFiles = new Set(Object.values(matchMap));
    return uploadedPhotos.filter(f => !usedFiles.has(f));
  };

  // 🛠️ 수동 매칭 처리
  const handleManualMatch = (rowIndex: string, file: File) => {
    setMatchMap(prev => ({ ...prev, [rowIndex]: file }));
  };

  // 🛠️ 일괄 등록 실행
  const executeBulkUpload = () => {
    const workersToUpload = excelData.map((row, idx) => ({
      employeeNumber: row['사번'] || row['employeeNumber'] || '',
      name: row['이름'] || row['name'] || '',
      team: row['소속'] || row['team'] || '',
      photoFile: matchMap[idx] // 파일 객체 포함
    }));

    onBulkUpload(workersToUpload);

    setShowBulkUploadDialog(false);
    setBulkStep(1);
    setExcelData([]);
    setUploadedPhotos([]);
    setMatchMap({});
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
                  setFormData({ employeeNumber: '', name: '', team: '', photoFile: null });
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
                {/* 🛠️ [추가] 사진 컬럼 헤더 */}
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">사진</th>
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">사번</th>
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">이름</th>
                <th className="px-6 py-4 text-left text-sm text-blue-100 font-semibold">소속팀</th>
                <th className="px-6 py-4 text-right text-sm text-blue-100 font-semibold">관리</th>
              </tr>
              </thead>
              <tbody>
              {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    {/* 🛠️ [수정] Hover Zoom 디자인 적용 */}
                    <td className="px-6 py-4 relative group">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-700 border border-slate-600 transition-all duration-200 ease-out group-hover:scale-[2.5] group-hover:z-50 group-hover:shadow-2xl group-hover:border-blue-400 origin-left">
                        {worker.photoUrl ? (
                            <img
                                src={worker.photoUrl}
                                alt={worker.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // 이미지 로드 실패 시 숨김 처리
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No</div>
                        )}
                      </div>
                    </td>
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
                    <td colSpan={5} className="px-6 py-12 text-center text-blue-200 font-medium">
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
              {/* 🛠️ 사진 업로드 필드 */}
              <div>
                <Label className="text-white mb-2 block">작업자 사진 (필수)</Label>
                <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="bg-slate-800 border-slate-700 text-white cursor-pointer"
                />
                {formData.photoFile && (
                    <p className="text-green-400 text-xs mt-1 flex items-center">
                      <Check className="w-3 h-3 mr-1" /> {formData.photoFile.name}
                    </p>
                )}
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
              {/* 🛠️ 수정용 사진 업로드 필드 */}
              <div>
                <Label className="text-white mb-2 block">작업자 사진 교체 (선택)</Label>
                <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="bg-slate-800 border-slate-700 text-white cursor-pointer"
                />
                <p className="text-gray-500 text-xs mt-1">
                  * 새로운 사진을 선택하지 않으면 기존 사진이 유지됩니다.
                </p>
                {formData.photoFile && (
                    <p className="text-green-400 text-xs mt-1 flex items-center">
                      <Check className="w-3 h-3 mr-1" /> {formData.photoFile.name} (교체 예정)
                    </p>
                )}
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
          <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">엑셀 일괄 등록</DialogTitle>
              <DialogDescription className="text-gray-400">
                {bulkStep === 1 ? "엑셀 명단과 작업자 사진을 업로드하세요." : "사진 매칭을 확인하세요."}
              </DialogDescription>
            </DialogHeader>

            {bulkStep === 1 && (
                <div className="space-y-6 py-4">
                  {/* 1. 엑셀 업로드 영역 */}
                  <div className="space-y-2">
                    <Label className="text-white">1. 작업자 명단 (엑셀)</Label>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-colors">
                      <input type="file" accept=".xlsx,.xls" onChange={handleExcelFile} className="hidden" id="excel-upload" />
                      <label htmlFor="excel-upload" className="cursor-pointer block">
                        {excelData.length > 0 ? (
                            <div className="text-green-400 font-semibold flex items-center justify-center gap-2">
                              <Check className="w-5 h-5"/> {excelData.length}명 명단 로드 완료
                            </div>
                        ) : (
                            <>
                              <FileSpreadsheet className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <span className="text-gray-400">엑셀 파일을 선택하세요</span>
                            </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* 2. 사진 업로드 영역 */}
                  <div className="space-y-2">
                    <Label className="text-white">2. 작업자 사진 (전체 선택)</Label>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-colors">
                      <input type="file" accept="image/*" multiple onChange={handlePhotoFiles} className="hidden" id="photo-upload" />
                      <label htmlFor="photo-upload" className="cursor-pointer block">
                        {uploadedPhotos.length > 0 ? (
                            <div className="text-green-400 font-semibold flex items-center justify-center gap-2">
                              <Check className="w-5 h-5"/> {uploadedPhotos.length}장 사진 로드 완료
                            </div>
                        ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <span className="text-gray-400">사진 파일들을 드래그하거나 선택하세요</span>
                            </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                        onClick={() => setBulkStep(2)}
                        disabled={excelData.length === 0}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    >
                      다음: 매칭 확인
                    </Button>
                  </div>
                </div>
            )}

            {bulkStep === 2 && (
                <div className="space-y-4 py-4">
                  {/* 매칭 리스트 테이블 */}
                  <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-700/50 text-gray-300">
                      <tr>
                        <th className="p-3">이름</th>
                        <th className="p-3">사번</th>
                        <th className="p-3">사진 상태</th>
                        <th className="p-3 text-right">관리</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                      {excelData.map((row, idx) => {
                        const isMatched = !!matchMap[idx];
                        return (
                            <tr key={idx} className="hover:bg-slate-700/30">
                              <td className="p-3 text-white">{row['이름'] || row['name']}</td>
                              <td className="p-3 text-gray-400">{row['사번'] || row['employeeNumber']}</td>
                              <td className="p-3">
                                {isMatched ? (
                                    <span className="text-green-400 flex items-center gap-1">
                                                <Check className="w-3 h-3"/> {matchMap[idx]?.name}
                                            </span>
                                ) : (
                                    <span className="text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3"/> 사진 없음
                                            </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {!isMatched && (
                                    <select
                                        className="bg-slate-800 border border-slate-600 text-xs text-white rounded p-1"
                                        onChange={(e) => {
                                          const file = uploadedPhotos.find(f => f.name === e.target.value);
                                          if(file) handleManualMatch(idx.toString(), file);
                                        }}
                                    >
                                      <option value="">사진 선택...</option>
                                      {/* 소거법: 아직 선택되지 않은 사진만 표시 */}
                                      {getUnusedPhotos().map(photo => (
                                          <option key={photo.name} value={photo.name}>{photo.name}</option>
                                      ))}
                                    </select>
                                )}
                              </td>
                            </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setBulkStep(1)} className="border-slate-700 text-white">이전</Button>
                    <Button onClick={executeBulkUpload} className="bg-green-600 hover:bg-green-700 text-white">
                      일괄 등록 완료
                    </Button>
                  </div>
                </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}