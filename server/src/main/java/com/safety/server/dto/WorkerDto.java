package com.safety.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkerDto {

    // React: id, DB: worker_id
    private String id;

    // React: employeeNumber, DB: ❗️해당 컬럼 없음❗️
    // (AI 서버가 이 값을 반환하지 않으면 null로 전송됩니다)
    private String employeeNumber;

    // React: name, DB: name
    private String name;

    // React: team, DB: department
    // (AI 서버가 department 값을 조회하여 "team"으로 반환해야 함)
    private String team;
}