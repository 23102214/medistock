package com.medistock.controller;

import com.medistock.dto.JwtResponse;
import com.medistock.dto.LoginRequest;
import com.medistock.dto.UserDto;
import com.medistock.response.ApiResponse;
import com.medistock.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Gateway", description = "Secure portal logins, registrations, and session details")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Establish security session", description = "Authenticates user and returns JWT credentials")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse response = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Session established successfully", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Register operator profile", description = "Register a new clinical database administrator, pharmacist, or staff")
    public ResponseEntity<ApiResponse<UserDto>> register(@Valid @RequestBody UserDto userDto) {
        UserDto registered = authService.registerUser(userDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account registered successfully: " + registered.getUsername(), registered));
    }

    @GetMapping("/me")
    @Operation(summary = "Active User Profile", description = "Retrieves profile attributes for the logged-in user")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDto profile = authService.getProfileByUsername(username);
        return ResponseEntity.ok(ApiResponse.success("Active profile loaded", profile));
    }
}
