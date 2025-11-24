package com.safety.server.repository;

import com.safety.server.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface WorkerRepository extends JpaRepository<Worker, Long> {

    boolean existsByEmployeeNumber(String employeeNumber);

    // 🛠️ [핵심] vector 타입 데이터를 저장하기 위한 네이티브 쿼리
    // JPA가 vector 타입을 모르기 때문에, 강제로 cast(:faceVector as vector)를 해줍니다.
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO workers (name, employee_number, department, image_path, face_vector, created_at) " +
            "VALUES (:name, :employeeNumber, :department, :imagePath, cast(:faceVector as vector), NOW())",
            nativeQuery = true)
    void saveWorkerWithVector(
            @Param("name") String name,
            @Param("employeeNumber") String employeeNumber,
            @Param("department") String department,
            @Param("imagePath") String imagePath,
            @Param("faceVector") String faceVector
    );
}