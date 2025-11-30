package com.safety.server.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workers")
@Getter @Setter
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "worker_id") // DB 컬럼명: worker_id
    private Long id;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "department", length = 100)
    private String department; // Frontend의 'team'과 매핑

    // ⚠️ DB 스키마에 없었지만 Frontend에서 보내주므로 추가 필요!
    @Column(name = "employee_number", unique = true)
    private String employeeNumber;

    @Column(name = "image_path", length = 255)
    private String imagePath; // Frontend의 'photoUrl'과 매핑

    // Java에서는 String으로 갖고 있다가, 저장할 때 ::vector로 캐스팅함
    // 조회할 때는 읽기 전용으로 매핑하거나, Native Query 사용
    @Column(name = "face_vector", columnDefinition = "vector(512)", insertable = false, updatable = false)
    private String faceVector;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 🆕 상태 필드 추가 (WORKING, RESTING, OFF_WORK)
    @Column(name = "status", length = 20)
    private String status = "OFF_WORK"; // 기본값은 퇴근 상태
}