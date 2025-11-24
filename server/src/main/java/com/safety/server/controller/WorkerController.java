package com.safety.server.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safety.server.dto.WorkerRegistrationDto;
import com.safety.server.entity.Worker;
import com.safety.server.service.WorkerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/workers")
@CrossOrigin(origins = "*") // 🛠️ React 접속 허용
public class WorkerController {

    private final WorkerService workerService;
    private final ObjectMapper objectMapper;

    public WorkerController(WorkerService workerService) {
        this.workerService = workerService;
        this.objectMapper = new ObjectMapper();
    }

    // 🛠️ [신규] 작업자 목록 조회
    @GetMapping
    public ResponseEntity<List<Worker>> getAllWorkers() {
        return ResponseEntity.ok(workerService.getAllWorkers());
    }

    // 🛠️ 일괄 등록 API
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
            return ResponseEntity.internalServerError().body("등록 중 오류 발생: " + e.getMessage());
        }
    }
}