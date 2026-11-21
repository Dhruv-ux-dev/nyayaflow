package com.nyayaflow.user;

import java.util.List;

import com.nyayaflow.user.dto.DirectoryEntry;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only list of active people for assignment pickers. Lawyers do not need it and cannot use it,
 * so the bar's contact list is not exposed to every account.
 */
@RestController
@RequestMapping("/api/directory")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'JUDGE')")
public class DirectoryController {

    private final UserService userService;

    public DirectoryController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public List<DirectoryEntry> users(@RequestParam Role role, @RequestParam(required = false) Long courtId) {
        return userService.directory(role, courtId);
    }
}
