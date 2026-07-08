package com.medistock.service;

import com.medistock.dto.JwtResponse;
import com.medistock.dto.LoginRequest;
import com.medistock.dto.UserDto;

public interface AuthService {
    JwtResponse authenticateUser(LoginRequest loginRequest);
    UserDto registerUser(UserDto userDto);
    UserDto getProfileByUsername(String username);
}
