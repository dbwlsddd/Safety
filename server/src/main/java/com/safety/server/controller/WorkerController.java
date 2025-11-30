package com.safety.server.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safety.server.dto.WorkerRegistrationDto;
import com.safety.server.entity.SystemConfig;
import com.safety.server.entity.Worker;
import com.safety.server.service.WorkerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workers")
//@CrossOrigin(origins = "*")
public class WorkerController {

    private final WorkerService workerService;
    private final ObjectMapper objectMapper;

    public WorkerController(WorkerService workerService) {
        this.workerService = workerService;
        this.objectMapper = new ObjectMapper();
    }

    // [조회] 전체 작업자 조회
    @GetMapping
    public ResponseEntity<List<Worker>> getAllWorkers() {
        return ResponseEntity.ok(workerService.getAllWorkers());
    }

    // [신규] 개별 작업자 등록 (사진 포함)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> registerWorker(
            @RequestPart("employeeNumber") String employeeNumber,
            @RequestPart("name") String name,
            @RequestPart("team") String team,
            @RequestPart(value = "photoFile", required = false) MultipartFile photoFile
    ) {
        try {
            WorkerRegistrationDto dto = new WorkerRegistrationDto();
            dto.setEmployeeNumber(employeeNumber);
            dto.setName(name);
            dto.setTeam(team);

            workerService.registerWorker(dto, photoFile);
            return ResponseEntity.ok().body("작업자 등록이 완료되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("등록 중 오류 발생: " + e.getMessage());
        }
    }

    // [신규] 작업자 정보 수정 (사진 변경 가능)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateWorker(
            @PathVariable Long id,
            @RequestPart("employeeNumber") String employeeNumber,
            @RequestPart("name") String name,
            @RequestPart("team") String team,
            @RequestPart(value = "photoFile", required = false) MultipartFile photoFile
    ) {
        try {
            WorkerRegistrationDto dto = new WorkerRegistrationDto();
            dto.setEmployeeNumber(employeeNumber);
            dto.setName(name);
            dto.setTeam(team);

            workerService.updateWorker(id, dto, photoFile);
            return ResponseEntity.ok().body("작업자 정보 수정이 완료되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("수정 중 오류 발생: " + e.getMessage());
        }
    }

    // [신규] 작업자 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWorker(@PathVariable Long id) {
        try {
            workerService.deleteWorker(id);
            return ResponseEntity.ok().body("작업자가 삭제되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("삭제 중 오류 발생: " + e.getMessage());
        }
    }

    @PostMapping("/batch-delete")
    public ResponseEntity<Void> deleteWorkers(@RequestBody List<Long> ids) {
        workerService.deleteWorkers(ids);
        return ResponseEntity.noContent().build();
    }

    // [기존] 일괄 등록 API
    @PostMapping(value = "/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> bulkRegister(
            @RequestPart("data") String workerDataJson,
            @RequestPart("files") List<MultipartFile> files
    ) {
        try {
            List<WorkerRegistrationDto> workerDtos = objectMapper.readValue(
                    workerDataJson,
                    new TypeReference<List<WorkerRegistrationDto>>() {}
            );

            workerService.bulkRegisterWorkers(workerDtos, files);
            return ResponseEntity.ok().body("일괄 등록이 완료되었습니다.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("일괄 등록 중 오류 발생: " + e.getMessage());
        }
    }

    // 🆕 작업자 상태 변경 (출근, 퇴근, 휴식 등)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateWorkerStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status"); // "WORKING", "RESTING", "OFF_WORK"

        // 간단한 유효성 검사
        if (newStatus == null ||
                (!newStatus.equals("WORKING") && !newStatus.equals("RESTING") && !newStatus.equals("OFF_WORK"))) {
            return ResponseEntity.badRequest().body("잘못된 상태 값입니다.");
        }

        try {
            workerService.updateWorkerStatus(id, newStatus);
            return ResponseEntity.ok().body("상태가 변경되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("오류 발생: " + e.getMessage());
        }
    }

    // 보호구 리스트 돌려주기
    @GetMapping("/equipment")
    public ResponseEntity<?> selectEquipment() {
        
        return workerService.selectEquipment();
    }
}