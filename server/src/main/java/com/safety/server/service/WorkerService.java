package com.safety.server.service;

import com.safety.server.dto.WorkerRegistrationDto;
import com.safety.server.entity.Worker; // Entity 임포트 확인
import com.safety.server.repository.WorkerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class WorkerService {

    private final WorkerRepository workerRepository;
    private final AiProcessingService aiProcessingService;

    // 파일 저장 경로
    private final String UPLOAD_DIR = "uploads/images/";

    public WorkerService(AiProcessingService aiProcessingService, WorkerRepository workerRepository) {
        this.aiProcessingService = aiProcessingService;
        this.workerRepository = workerRepository;
    }

    // 🛠️ [신규] 전체 작업자 조회
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
    }

    @Transactional
    public void bulkRegisterWorkers(List<WorkerRegistrationDto> workerDtos, List<MultipartFile> files) {
        // 1. 파일 맵핑
        Map<String, MultipartFile> fileMap = files.stream()
                .collect(Collectors.toMap(MultipartFile::getOriginalFilename, Function.identity()));

        // 2. 디렉토리 생성
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리 생성 실패", e);
        }

        // 3. 순회 저장
        for (WorkerRegistrationDto dto : workerDtos) {
            try {
                processSingleWorker(dto, fileMap.get(dto.getMappedFileName()));
            } catch (Exception e) {
                System.err.println("작업자 등록 실패 (" + dto.getName() + "): " + e.getMessage());
            }
        }
    }

    private void processSingleWorker(WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        if (photoFile == null) {
            // 사진이 없는 경우 예외처리 혹은 기본 이미지 처리 정책 필요
            System.err.println("사진 파일 누락: " + dto.getName());
            return;
        }

        // 중복 사번 체크
        if (workerRepository.existsByEmployeeNumber(dto.getEmployeeNumber())) {
            System.out.println("이미 존재하는 사번: " + dto.getEmployeeNumber());
            return;
        }

        // 1. 파일 저장
        String newFileName = dto.getEmployeeNumber() + "_" + UUID.randomUUID().toString() + "_" + photoFile.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + newFileName);
        Files.write(path, photoFile.getBytes());
        String savedFilePath = "/" + UPLOAD_DIR + newFileName;

        // 2. AI 벡터 추출
        List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);
        String vectorString = vectorList.toString();

        // 3. DB 저장 (Native Query)
        workerRepository.saveWorkerWithVector(
                dto.getName(),
                dto.getEmployeeNumber(),
                dto.getTeam(),
                savedFilePath,
                vectorString
        );

        System.out.println("등록 완료: " + dto.getName());
    }
}