package com.safety.server.service;

import com.safety.server.dto.WorkerRegistrationDto;
import com.safety.server.entity.Worker;
import com.safety.server.repository.WorkerRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        return workerRepository.findAllByEmployeeNumberAsc();
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

        // 공통 등록 로직 호출
        processRegisterWithFile(dto, photoFile);
    }

    // [신규] 작업자 정보 수정
    @Transactional
    public void updateWorker(Long id, WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 작업자입니다."));

        // 사진 변경이 있는 경우
        if (photoFile != null && !photoFile.isEmpty()) {
            // 공통 수정 로직 호출 (파일 포함)
            processUpdateWithFile(worker, dto, photoFile);
        } else {
            // 사진 변경 없음: 정보만 업데이트 (JPA Dirty Checking)
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

    @Transactional
    public void deleteWorkers(List<Long> ids) {
        // 1. 삭제할 작업자 정보 조회 (이미지 경로를 알기 위해 필요)
        List<Worker> workers = workerRepository.findAllById(ids);

        if (workers.isEmpty()) {
            return;
        }

        // 2. 물리적 파일 삭제
        for (Worker worker : workers) {
            deleteFile(worker.getImagePath());
        }

        // 3. DB 데이터 일괄 삭제
        workerRepository.deleteAll(workers);
    }

    // [수정됨] 일괄 등록 (Upsert 로직: 존재하면 수정, 없으면 등록)
    @Transactional
    public void bulkRegisterWorkers(List<WorkerRegistrationDto> workerDtos, List<MultipartFile> files) {
        // 파일 이름으로 MultipartFile 매핑
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
                String empNum = dto.getEmployeeNumber();

                // 1. 사번으로 기존 작업자 조회 (Repository에 findByEmployeeNumber 필요)
                Optional<Worker> existingWorkerOpt = workerRepository.findByEmployeeNumber(empNum);

                if (existingWorkerOpt.isPresent()) {
                    // [CASE 1] 이미 존재함 -> 정보 수정 (Update)
                    Worker existingWorker = existingWorkerOpt.get();

                    if (file != null) {
                        // 파일이 있으면: 사진 + 정보 업데이트
                        processUpdateWithFile(existingWorker, dto, file);
                    } else {
                        // 파일이 없으면: 이름/부서만 변경
                        existingWorker.setName(dto.getName());
                        existingWorker.setDepartment(dto.getTeam());
                        workerRepository.save(existingWorker);
                    }

                } else {
                    // [CASE 2] 존재하지 않음 -> 신규 등록 (Insert)
                    if (file != null) {
                        processRegisterWithFile(dto, file);
                    } else {
                        System.err.println("사진 누락으로 등록 실패: " + dto.getName());
                    }
                }

            } catch (Exception e) {
                System.err.println("일괄 처리 실패 (" + dto.getName() + "): " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    // 🆕 상태 변경 서비스 메서드
    @Transactional
    public void updateWorkerStatus(Long id, String status) {
        // 존재 여부 확인
        if (!workerRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 작업자입니다.");
        }
        workerRepository.updateWorkerStatus(id, status);
    }


    // =================================================================================
    // 내부 헬퍼 메서드 (코드 중복 방지)
    // =================================================================================

    /**
     * 신규 등록 처리를 수행하는 내부 메서드 (파일 저장 -> 벡터 추출 -> DB 저장)
     */
    private void processRegisterWithFile(WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        // 1. 파일 저장 (물리적 파일 생성)
        String newFileName = saveFile(photoFile, dto.getEmployeeNumber());

        // 🛠️ [수정됨] DB에는 '웹 접근 경로' 또는 '파일명'만 저장
        String savedFilePath = UPLOAD_DIR + newFileName;

        // 2. AI 벡터 추출
        List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

        // 3. DB 저장 (네이티브 쿼리 사용)
        workerRepository.saveWorkerWithVector(
                dto.getName(),
                dto.getEmployeeNumber(),
                dto.getTeam(),
                savedFilePath,
                vectorList.toString()
        );
    }

    /**
     * 수정 처리를 수행하는 내부 메서드 (기존 파일 삭제 -> 새 파일 저장 -> 벡터 추출 -> DB 업데이트)
     */
    private void processUpdateWithFile(Worker worker, WorkerRegistrationDto dto, MultipartFile photoFile) throws IOException {
        // 기존 파일 삭제
        deleteFile(worker.getImagePath());

        // 새 파일 저장 및 벡터 추출
        String newFileName = saveFile(photoFile, dto.getEmployeeNumber());
        String savedFilePath = UPLOAD_DIR + newFileName;
        List<Double> vectorList = aiProcessingService.extractFaceVector(photoFile);

        // DB 업데이트 (네이티브 쿼리 사용)
        workerRepository.updateWorkerWithVector(
                worker.getId(),
                dto.getName(),
                dto.getEmployeeNumber(),
                dto.getTeam(),
                savedFilePath,
                vectorList.toString()
        );
    }

    // 파일 저장 헬퍼 메서드
    private String saveFile(MultipartFile file, String employeeNumber) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalName = file.getOriginalFilename();

        // 🛠️ [핵심 수정] 한글 깨짐 방지를 위해 "원본 파일명"은 버리고 "확장자"만 추출
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        } else {
            extension = ".jpg"; // 확장자가 없는 경우 안전하게 jpg로 처리
        }

        // 최종 파일명: 사번_UUID_확장자 (예: 202401_a1b2-c3d4.jpg) -> 100% 영어/숫자
        String fileName = employeeNumber + "_" + UUID.randomUUID().toString() + extension;

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