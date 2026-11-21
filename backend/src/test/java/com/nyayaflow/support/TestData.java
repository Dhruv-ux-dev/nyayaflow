package com.nyayaflow.support;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CaseType;
import com.nyayaflow.cases.PartySide;
import com.nyayaflow.cases.PartyType;
import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.cases.dto.CreateCaseRequest;
import com.nyayaflow.cases.dto.LawyerAppearanceRequest;
import com.nyayaflow.cases.dto.PartyRequest;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.CourtRepository;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Builds the minimum world a test needs: a court, people in each role and cases. */
@TestComponent
public class TestData {

    public static final String PASSWORD = "Secret123";
    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final UserRepository users;
    private final CourtRepository courts;
    private final CaseService caseService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private String passwordHash;

    public TestData(UserRepository users, CourtRepository courts, CaseService caseService,
                    PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.courts = courts;
        this.caseService = caseService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    public Court court() {
        int n = SEQUENCE.incrementAndGet();
        Court court = new Court();
        court.setCode("T" + n);
        court.setName("Test Court " + n);
        court.setCity("Testpur");
        court.addCourtroom("Room A", null);
        court.addCourtroom("Room B", null);
        return courts.saveAndFlush(court);
    }

    public User user(Role role, Court court) {
        int n = SEQUENCE.incrementAndGet();
        if (passwordHash == null) {
            passwordHash = passwordEncoder.encode(PASSWORD);
        }
        User user = new User();
        user.setFullName(role.name().charAt(0) + role.name().substring(1).toLowerCase() + " " + n);
        user.setEmail(role.name().toLowerCase() + n + "@example.test");
        user.setRole(role);
        user.setPasswordHash(passwordHash);
        user.setCredentialsChangedAt(clock.instant().minus(Duration.ofMinutes(5)));
        if (role == Role.LAWYER) {
            user.setBarRegistrationNumber("TB/" + n + "/2020");
        }
        if (role == Role.JUDGE || role == Role.STAFF) {
            user.setCourt(court);
        }
        return users.saveAndFlush(user);
    }

    /** Registers a case through the real service, optionally allocated to a judge. */
    public CaseDetailResponse registerCase(User staff, Court court, User judge, User... lawyers) {
        List<LawyerAppearanceRequest> appearances = java.util.Arrays.stream(lawyers)
                .map(l -> new LawyerAppearanceRequest(l.getId(), PartySide.PETITIONER, false))
                .toList();
        CreateCaseRequest request = new CreateCaseRequest("Asha Rao v. Bharat Traders", CaseType.CIVIL_SUIT,
                "Recovery of dues.", CasePriority.NORMAL, LocalDate.now(clock).minusDays(3), court.getId(),
                court.getCourtrooms().getFirst().getId(), judge == null ? null : judge.getId(),
                List.of(new PartyRequest(PartySide.PETITIONER, PartyType.INDIVIDUAL, "Asha Rao", null),
                        new PartyRequest(PartySide.RESPONDENT, PartyType.ORGANIZATION, "Bharat Traders", null)),
                appearances);
        return caseService.create(request, AuthenticatedUser.from(staff));
    }

    /** A slot on the next day the court sits, at the given time. */
    public LocalDateTime nextCourtDayAt(int hour, int minute) {
        LocalDate day = LocalDate.now(clock).plusDays(1);
        while (day.getDayOfWeek() == DayOfWeek.SUNDAY) {
            day = day.plusDays(1);
        }
        return day.atTime(LocalTime.of(hour, minute));
    }

    public LocalDate nextSunday() {
        LocalDate day = LocalDate.now(clock).plusDays(1);
        while (day.getDayOfWeek() != DayOfWeek.SUNDAY) {
            day = day.plusDays(1);
        }
        return day;
    }
}
