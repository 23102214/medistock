package com.medistock.service.impl;

import com.medistock.dto.JwtResponse;
import com.medistock.dto.LoginRequest;
import com.medistock.dto.UserDto;
import com.medistock.entity.User;
import com.medistock.exception.BadRequestException;
import com.medistock.exception.DuplicateResourceException;
import com.medistock.exception.ResourceNotFoundException;
import com.medistock.repository.UserRepository;
import com.medistock.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid credentials"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid credentials");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BadRequestException("This account is currently deactivated");
        }

        // Emit Mock JWT (since we are mocking token provider or using real token provider)
        String mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI" + user.getUsername() + "\"}";

        return JwtResponse.builder()
                .token(mockToken)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public UserDto registerUser(UserDto userDto) {
        if (userRepository.existsByUsername(userDto.getUsername())) {
            throw new DuplicateResourceException("Username already registered under another active operator");
        }

        if (userRepository.existsByEmail(userDto.getEmail())) {
            throw new DuplicateResourceException("Email already exists in directory");
        }

        User user = User.builder()
                .username(userDto.getUsername())
                .password(passwordEncoder.encode(userDto.getPassword()))
                .fullName(userDto.getFullName())
                .email(userDto.getEmail())
                .role(userDto.getRole())
                .status("ACTIVE")
                .joinedDate(LocalDate.now())
                .build();

        User savedUser = userRepository.save(user);

        return mapToDto(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Operator account not found"));
        return mapToDto(user);
    }

    private UserDto mapToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .joinedDate(user.getJoinedDate().toString())
                .build();
    }
}
