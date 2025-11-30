package com.safety.server.repository;

import com.safety.server.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional; // 추가됨

@Repository
public interface WorkerRepository extends JpaRepository<Worker, Long> {

    // employeeNumber ASC Sort 조회
    @Query(value = "SELECT * FROM public.workers ORDER BY CAST(employee_number as INTEGER) ASC", nativeQuery = true)
    List<Worker> findAllByEmployeeNumberAsc();

    // 사번 중복 체크 (기존)
    boolean existsByEmployeeNumber(String employeeNumber);

    // 🆕 [추가] 사번으로 작업자 정보 조회 (수정 시 ID를 찾기 위해 필요)
    Optional<Worker> findByEmployeeNumber(String employeeNumber);

    // 🛠️ [수정] INSERT 쿼리에 status 추가 (기본값 'OFF_WORK'로 들어가도록 처리하거나 명시)
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO workers (name, employee_number, department, image_path, face_vector, status, created_at) " +
            "VALUES (:name, :employeeNumber, :department, :imagePath, CAST(:faceVector AS vector), 'OFF_WORK', NOW())",
            nativeQuery = true)
    void saveWorkerWithVector(
            @Param("name") String name,
            @Param("employeeNumber") String employeeNumber,
            @Param("department") String department,
            @Param("imagePath") String imagePath,
            @Param("faceVector") String faceVector
    );

    // 🆕 [추가] 상태 변경을 위한 메서드
    @Modifying
    @Transactional
    @Query("UPDATE Worker w SET w.status = :status WHERE w.id = :id")
    void updateWorkerStatus(@Param("id") Long id, @Param("status") String status);

    // 🛠️ [수정] vector 및 정보 업데이트를 위한 네이티브 쿼리
    @Modifying
    @Transactional
    @Query(value = "UPDATE workers SET " +
            "name = :name, " +
            "employee_number = :employeeNumber, " +
            "department = :department, " +
            "image_path = :imagePath, " +
            "face_vector = CAST(:faceVector AS vector) " +
            "WHERE worker_id = :id",
            nativeQuery = true)
    void updateWorkerWithVector(
            @Param("id") Long id,
            @Param("name") String name,
            @Param("employeeNumber") String employeeNumber,
            @Param("department") String department,
            @Param("imagePath") String imagePath,
            @Param("faceVector") String faceVector
    );
}