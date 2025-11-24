package com.safety.server.dto;

public class WorkerRegistrationDto {
    private String name;
    private String employeeNumber;
    private String team;

    // Frontend에서 매칭된 파일명을 보냄 (서버에서 MultipartFile 리스트와 매칭하기 위함)
    private String mappedFileName;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmployeeNumber() { return employeeNumber; }
    public void setEmployeeNumber(String employeeNumber) { this.employeeNumber = employeeNumber; }

    public String getTeam() { return team; }
    public void setTeam(String team) { this.team = team; }

    public String getMappedFileName() { return mappedFileName; }
    public void setMappedFileName(String mappedFileName) { this.mappedFileName = mappedFileName; }
}