package com.safety.server.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data // @Getter, @Setter, @ToString, @EqualsAndHashCode, @RequiredArgsConstructor
@NoArgsConstructor // 기본 생성자
@AllArgsConstructor // 모든 필드를 인자로 받는 생성자
@JsonInclude(JsonInclude.Include.NON_NULL) // JSON 변환 시 null 필드 제외
public class WorkerRecognitionResult {

    private String status;  // 예: "SUCCESS", "FAILURE", "ERROR"
    private String message; // 예: "인식 성공", "인식된 작업자 없음"
    private WorkerDto worker;  // 인식된 작업자 정보 (실패 시 null)

    // Getter, Setter, 생성자, ToString 등이 모두 자동으로 생성됩니다.
}