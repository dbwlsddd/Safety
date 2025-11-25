package com.safety.server.service;

import com.safety.server.dto.WorkerRegistrationDto;
import com.safety.server.entity.Worker;
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

    // 전체 작업자 조회
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
    }

    // [신규] 개별 작업자 등록
    @Transactional
    public void registerWorker(WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        // 중복 사번 체크
        if (workerRepository.existsByEmployeeNumber(dto.getEmployeeNumber())) {
            throw new IllegalArgumentException("이미 존재하는 사번입니다: " + dto.getEmployeeNumber());
        }

        if (photoFile == null || photoFile.isEmpty()) {
            throw new IllegalArgumentException("작업자 사진은 필수입니다.");
        }

        // 파일 저장 및 벡터 추출
        String newFileName = saveFile(photoFile, dto.getEmployeeNumber());
        String savedFilePath = "/" + UPLOAD_DIR + newFileName;
        List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

        // DB 저장 (Native Query 사용)
        workerRepository.saveWorkerWithVector(
                dto.getName(),
                dto.getEmployeeNumber(),
                dto.getTeam(),
                savedFilePath,
                vectorList.toString()
        );
    }

    // [신규] 작업자 정보 수정
    @Transactional
    public void updateWorker(Long id, WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 작업자입니다."));

        // 기본 정보 업데이트
        worker.setName(dto.getName());
        worker.setEmployeeNumber(dto.getEmployeeNumber());
        worker.setDepartment(dto.getTeam());

        // 사진이 새로 업로드된 경우에만 이미지/벡터 교체
        if (photoFile != null && !photoFile.isEmpty()) {
            // 기존 파일 삭제 (선택사항 - 파일 관리 정책에 따라 결정)
            deleteFile(worker.getImagePath());

            // 새 파일 저장 및 벡터 추출
            String newFileName = saveFile(photoFile, dto.getEmployeeNumber());
            String savedFilePath = "/" + UPLOAD_DIR + newFileName;
            List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

            // 벡터 업데이트를 위해 Native Query 사용 필요 (엔티티의 updatable=false 때문)
            // Repository에 updateWorkerWithVector 메서드가 구현되어 있어야 함
            workerRepository.updateWorkerWithVector(
                    id,
                    dto.getName(),
                    dto.getEmployeeNumber(),
                    dto.getTeam(),
                    savedFilePath,
                    vectorList.toString()
            );
        } else {
            // 사진 변경이 없으면 기본 정보만 저장 (JPA Save)
            workerRepository.save(worker);
        }
    }

    // [신규] 작업자 삭제
    @Transactional
    public void deleteWorker(Long id) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 작업자입니다."));

        // 파일 삭제
        deleteFile(worker.getImagePath());

        // DB 삭제
        workerRepository.delete(worker);
    }

    // 일괄 등록 (기존 로직 유지)
    @Transactional
    public void bulkRegisterWorkers(List<WorkerRegistrationDto> workerDtos, List<MultipartFile> files) {
        Map<String, MultipartFile> fileMap = files.stream()
                .collect(Collectors.toMap(MultipartFile::getOriginalFilename, Function.identity()));

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리 생성 실패", e);
        }

        for (WorkerRegistrationDto dto : workerDtos) {
            try {
                MultipartFile file = fileMap.get(dto.getMappedFileName());
                if (file != null) {
                    registerWorker(dto, file); // 개별 등록 로직 재사용
                } else {
                    System.err.println("사진 누락: " + dto.getName());
                }
            } catch (Exception e) {
                System.err.println("일괄 등록 실패 (" + dto.getName() + "): " + e.getMessage());
            }
        }
    }

    // 파일 저장 헬퍼 메서드
    private String saveFile(MultipartFile file, String employeeNumber) throws IOException {
        Files.createDirectories(Paths.get(UPLOAD_DIR));
        String fileName = employeeNumber + "_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + fileName);
        Files.write(path, file.getBytes());
        return fileName;
    }

    // 파일 삭제 헬퍼 메서드
    private void deleteFile(String filePath) {
        if (filePath != null && !filePath.isEmpty()) {
            try {
                // DB 경로: /uploads/images/filename -> 실제 경로: uploads/images/filename
                String relativePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
                Files.deleteIfExists(Paths.get(relativePath));
            } catch (IOException e) {
                System.err.println("파일 삭제 실패: " + e.getMessage());
            }
        }
    }
}