package com.safety.server.dto;

// src/main/java/com/safety/server/dto/WorkerRecognitionResult.java
public class WorkerRecognitionResult {
    private boolean recognized;
    private String id;
    private String name;

    // Lombok 또는 생성자, Getter/Setter를 사용하여 필드 구현
    // 예시: 생성자
    public WorkerRecognitionResult(boolean recognized, String id, String name) {
        this.recognized = recognized;
        this.id = id;
        this.name = name;
    }

    public boolean isRecognized() { return recognized; }
    public String getId() { return id; }
    public String getName() { return name; }
}