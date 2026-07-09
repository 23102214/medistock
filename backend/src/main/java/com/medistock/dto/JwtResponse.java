package com.medistock.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtResponse {
    private Long id;
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String status;
    private String joinedDate;
}
