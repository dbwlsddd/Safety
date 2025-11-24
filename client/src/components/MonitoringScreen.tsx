import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ShieldAlert, User, Video } from 'lucide-react';
import { RecognitionResult } from '../types';

interface MonitoringScreenProps {
  state: RecognitionResult | null; // 데이터
  videoSlot: React.ReactNode;      // 웹캠 들어갈 자리
  children?: React.ReactNode;      // 버튼 들어갈 자리
  statusMessage?: string;          // 상태 메시지
}

// 🔥 [수정] 선언과 동시에 export default
export default function MonitoringScreen({
                                           state,
                                           videoSlot,
                                           children,
                                           statusMessage = "대기 중..."
                                         }: MonitoringScreenProps) {

  const renderSafetyStatus = () => {
    if (!state?.ppe_status) return <Badge variant="secondary">{statusMessage}</Badge>;

    return state.ppe_status.is_safe ? (
        <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-lg">
          <CheckCircle2 className="mr-2 w-5 h-5"/>안전 (Safe)
        </Badge>
    ) : (
        <Badge variant="destructive" className="px-4 py-1 text-lg animate-pulse">
          <AlertCircle className="mr-2 w-5 h-5"/>위반 (Violation)
        </Badge>
    );
  };

  return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex justify-between items-center shrink-0 px-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              작업자 안전 점검
            </h2>
            <p className="text-muted-foreground text-sm">
              카메라 정면을 응시하고 보호구 착용 상태를 확인하세요.
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {statusMessage}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <Card className="col-span-1 lg:col-span-2 shadow-md border-slate-200 flex flex-col overflow-hidden bg-black">
            <div className="flex-1 relative w-full h-full flex items-center justify-center">
              {videoSlot ? videoSlot : <div className="text-gray-500">카메라 신호 없음</div>}
            </div>
          </Card>

          <Card className="col-span-1 shadow-lg border-t-4 border-blue-600 flex flex-col h-full bg-white dark:bg-slate-900">
            <CardHeader className="shrink-0 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="text-blue-600" />
                  감지 결과
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col space-y-6 overflow-y-auto">
              <div className="flex justify-center py-2">
                {renderSafetyStatus()}
              </div>

              {state ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <User className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Worker Info</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{state.worker?.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {state.worker?.department}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ShieldAlert className="w-4 h-4" /> <span className="text-xs font-bold uppercase">PPE Status</span>
                      </div>
                      {!state.ppe_status.is_safe && (
                          <Alert variant="destructive" className="py-2 text-sm bg-red-50 dark:bg-red-900/20 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>필수 보호구를 착용해주세요!</AlertTitle>
                          </Alert>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {state.ppe_status.detections.map((d, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white dark:bg-slate-800 px-3 py-1">
                              {d.label}
                            </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <p className="text-sm">AI 분석 중...</p>
                  </div>
              )}

              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                {children}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}