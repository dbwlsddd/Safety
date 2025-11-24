import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2 } from 'lucide-react';

// 🔥 [수정] 선언과 동시에 export default
export default function WorkerManagement() {
  // 실제 구현 시에는 API로 데이터를 받아오세요.
  const workers: any[] = [];

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">작업자 관리</h2>
            <p className="text-muted-foreground">현장 작업자의 등록 및 상태를 관리합니다.</p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> 작업자 등록
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>등록된 작업자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.length > 0 ? (
                    workers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium">{worker.id}</TableCell>
                          <TableCell>{worker.name}</TableCell>
                          <TableCell>{worker.dept}</TableCell>
                          <TableCell>
                            <Badge variant={worker.status === '근무중' ? 'default' : 'secondary'}>
                              {worker.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                        등록된 작업자가 없습니다.
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