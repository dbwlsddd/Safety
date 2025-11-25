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

    // 🛠️ [수정됨] 서버 실행 위치(server/) 기준으로 Safety/images/ 경로 설정
    // 끝에 슬래시(/) 포함
    private final String UPLOAD_DIR = "../images/";

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
        if (workerRepository.existsByEmployeeNumber(dto.getEmployeeNumber())) {
            throw new IllegalArgumentException("이미 존재하는 사번입니다: " + dto.getEmployeeNumber());
        }

        if (photoFile == null || photoFile.isEmpty()) {
            throw new IllegalArgumentException("작업자 사진은 필수입니다.");
        }

        // 1. 파일 저장 (물리적 파일 생성)
        String newFileName = saveFile(photoFile, dto.getEmployeeNumber());

        // 🛠️ [수정됨] DB에는 '웹 접근 경로' 또는 '파일명'만 저장하는 것이 좋습니다.
        // 여기서는 파일 시스템 경로를 저장하지만, 프론트엔드에서 이미지를 불러오려면
        // WebMvcConfig에서 리소스 매핑이 필요합니다. (아래 팁 참고)
        String savedFilePath = UPLOAD_DIR + newFileName;

        // 2. AI 벡터 추출
        List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

        // 3. DB 저장
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

        // 사진 변경이 있는 경우
        if (photoFile != null && !photoFile.isEmpty()) {
            deleteFile(worker.getImagePath()); // 기존 파일 삭제

            String newFileName = saveFile(photoFile, dto.getEmployeeNumber());
            String savedFilePath = UPLOAD_DIR + newFileName;
            List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

            workerRepository.updateWorkerWithVector(
                    id,
                    dto.getName(),
                    dto.getEmployeeNumber(),
                    dto.getTeam(),
                    savedFilePath,
                    vectorList.toString()
            );
        } else {
            // 사진 변경 없음: 정보만 업데이트 (JPA Dirty Checking 또는 명시적 저장)
            worker.setName(dto.getName());
            worker.setEmployeeNumber(dto.getEmployeeNumber());
            worker.setDepartment(dto.getTeam());
            workerRepository.save(worker);
        }
    }

    // [신규] 작업자 삭제
    @Transactional
    public void deleteWorker(Long id) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 작업자입니다."));

        deleteFile(worker.getImagePath());
        workerRepository.delete(worker);
    }

    // 일괄 등록
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
                    registerWorker(dto, file);
                } else {
                    System.err.println("사진 누락: " + dto.getName());
                }
            } catch (Exception e) {
                System.err.println("일괄 등록 실패 (" + dto.getName() + "): " + e.getMessage());
            }
        }
    }

    private String saveFile(MultipartFile file, String employeeNumber) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalName = file.getOriginalFilename();
        // 파일명 충돌 방지용 UUID 추가
        String fileName = employeeNumber + "_" + UUID.randomUUID().toString() + "_" + originalName;
        Path path = uploadPath.resolve(fileName);
        Files.write(path, file.getBytes());

        return fileName;
    }

    private void deleteFile(String filePath) {
        if (filePath != null && !filePath.isEmpty()) {
            try {
                Path path = Paths.get(filePath);
                Files.deleteIfExists(path);
            } catch (IOException e) {
                System.err.println("파일 삭제 실패: " + e.getMessage());
            }
        }
    }
}