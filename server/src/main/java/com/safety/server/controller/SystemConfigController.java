package com.safety.server.controller;

import com.safety.server.entity.SystemConfig;
import com.safety.server.repository.SystemConfigRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class SystemConfigController {

    private final SystemConfigRepository configRepository;

    public SystemConfigController(SystemConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    // 설정 조회 (없으면 기본값 반환)
    @GetMapping
    public ResponseEntity<SystemConfig> getConfig() {
        List<SystemConfig> configs = configRepository.findAll();
        if (configs.isEmpty()) {
            // 초기 설정이 없으면 기본값 생성
            SystemConfig defaultConfig = new SystemConfig();
            defaultConfig.setAdminPassword("1234");
            defaultConfig.setWarningDelaySeconds(10);
            defaultConfig.setRequiredEquipment("헬멧,작업화"); // 예시
            return ResponseEntity.ok(configRepository.save(defaultConfig));
        }
        return ResponseEntity.ok(configs.get(0));
    }

    // 설정 업데이트
    @PutMapping
    public ResponseEntity<SystemConfig> updateConfig(@RequestBody SystemConfig newConfig) {
        List<SystemConfig> configs = configRepository.findAll();
        SystemConfig currentConfig = configs.isEmpty() ? new SystemConfig() : configs.get(0);

        currentConfig.setAdminPassword(newConfig.getAdminPassword());
        currentConfig.setWarningDelaySeconds(newConfig.getWarningDelaySeconds());
        currentConfig.setRequiredEquipment(newConfig.getRequiredEquipment());

        return ResponseEntity.ok(configRepository.save(currentConfig));
    }

    @PostMapping("/verify-admin")
    public ResponseEntity<?> verifyAdminPassword(@RequestBody Map<String, String> payload) {
        String inputPassword = payload.get("password");

        // DB에서 저장된 설정 가져오기
        SystemConfig config = configRepository.findAll().get(0);

        if (config.getAdminPassword().equals(inputPassword)) {
            return ResponseEntity.ok().build(); // 200 OK
        } else {
            return ResponseEntity.status(401).body("비밀번호 불일치"); // 401 Unauthorized
        }
    }
}