import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Calendar } from 'lucide-react';

// 🔥 [수정] 선언과 동시에 export default
export default function AccessLog() {
  // 실제 구현 시 API로 데이터 로드
  const logs: any[] = [];

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">출입 및 위반 이력</h2>
            <p className="text-muted-foreground">작업자의 현장 출입 기록과 안전 규정 위반 내역을 조회합니다.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" /> 날짜 선택
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> 엑셀 다운로드
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>이력 목록</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="이름 또는 부서 검색..." className="w-[250px]" />
                <Button size="icon" variant="ghost">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>총 {logs.length}건의 기록이 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>상세 내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                    logs.map((log) => (
                        <TableRow key={log.id}>
                          {/* 데이터 매핑 로직 */}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                        표시할 이력이 없습니다.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}