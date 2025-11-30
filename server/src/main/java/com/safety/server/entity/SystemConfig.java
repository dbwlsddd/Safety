package com.safety.server.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "system_config")
@Getter @Setter
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 관리자 비밀번호
    @Column(name = "admin_password")
    private String adminPassword;

    // 경고 유예 시간 (초)
    @Column(name = "warning_delay_seconds")
    private Integer warningDelaySeconds;

    // 필수 보호구 목록 (JSON 문자열이나 쉼표로 구분된 문자열로 저장)
    // 간단하게 쉼표(,)로 구분된 String으로 저장하는 예시입니다.
    @Column(name = "required_equipment", length = 500)
    private String requiredEquipment;
}