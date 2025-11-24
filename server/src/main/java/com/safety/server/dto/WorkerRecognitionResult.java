package com.safety.server.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkerRecognitionResult {

    private String status;
    private String message;
    private WorkerDto worker;

    // 🔥 [추가] 보호구 감지 상태 필드
    private PpeStatusDto ppeStatus;

    // 🔥 [추가] PPE 상태를 나타내는 내부 DTO
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PpeStatusDto {
        private boolean isSafe; // 전체 안전 여부

        // 감지된 보호구 목록 (Python의 detections 리스트를 받기 위한 구조)
        // box: List<Integer>, label: String, class_id: Integer 등을 포함
        private List<Map<String, Object>> detections;
    }
}