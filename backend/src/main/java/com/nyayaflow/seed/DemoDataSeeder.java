package com.nyayaflow.seed;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.config.NyayaFlowProperties;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.CourtRepository;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Populates a complete demo court — two courts, sixteen users and twenty-five cases at different
 * stages — when the database is empty. Disable with {@code NYAYAFLOW_SEED_DEMO_DATA=false}.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    /** Shared password of every demo account (documented in the README). */
    public static final String DEMO_PASSWORD = "Demo@123";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final NyayaFlowProperties properties;
    private final UserRepository users;
    private final CourtRepository courts;
    private final PasswordEncoder passwordEncoder;
    private final DemoCaseWriter caseWriter;
    private final AuditService audit;
    private final TransactionTemplate transaction;
    private final Clock clock;

    public DemoDataSeeder(NyayaFlowProperties properties, UserRepository users, CourtRepository courts,
                          PasswordEncoder passwordEncoder, DemoCaseWriter caseWriter, AuditService audit,
                          TransactionTemplate transaction, Clock clock) {
        this.properties = properties;
        this.users = users;
        this.courts = courts;
        this.passwordEncoder = passwordEncoder;
        this.caseWriter = caseWriter;
        this.audit = audit;
        this.transaction = transaction;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.seed().enabled()) {
            return;
        }
        if (users.count() > 0) {
            log.info("Database already has users; demo data seeding skipped.");
            return;
        }
        long started = System.currentTimeMillis();
        transaction.executeWithoutResult(status -> {
            Map<String, Court> courtsByCode = seedCourts();
            Map<String, User> people = seedPeople(courtsByCode);
            caseWriter.writeAll(DemoCases.all(), people, courtsByCode);
            seedRecentSignIns(people);
        });
        log.info("Demo data seeded in {} ms. Sign in with any demo account, password {}",
                System.currentTimeMillis() - started, DEMO_PASSWORD);
    }

    private Map<String, Court> seedCourts() {
        Instant established = clock.instant().minus(Duration.ofDays(720));
        Court city = court("ICC", "City Civil & Sessions Court, Indrapuri", "Indrapuri",
                "Nyaya Marg, Civil Lines, Indrapuri", established);
        city.addCourtroom("Court Room 1", "Ground Floor");
        city.addCourtroom("Court Room 2", "Ground Floor");
        city.addCourtroom("Court Room 3", "First Floor");
        city.addCourtroom("Court Room 4", "First Floor");
        Court district = court("SDC", "District Court, Shantipur", "Shantipur", "Collectorate Road, Shantipur",
                established);
        district.addCourtroom("Court Hall A", "Ground Floor");
        district.addCourtroom("Court Hall B", "Ground Floor");
        district.addCourtroom("Court Hall C", "First Floor");
        courts.saveAll(List.of(city, district));
        return Map.of("ICC", city, "SDC", district);
    }

    private Court court(String code, String name, String city, String address, Instant createdAt) {
        Court court = new Court();
        court.setCode(code);
        court.setName(name);
        court.setCity(city);
        court.setAddress(address);
        court.setCreatedAt(createdAt);
        court.setUpdatedAt(createdAt);
        return court;
    }

    private Map<String, User> seedPeople(Map<String, Court> courtsByCode) {
        String hash = passwordEncoder.encode(DEMO_PASSWORD);
        Instant joined = clock.instant().minus(Duration.ofDays(540));
        Map<String, User> people = new LinkedHashMap<>();
        Object[][] roster = {
                {"admin", "Aarav Mehta", "admin@nyayaflow.test", Role.ADMIN, "System Administrator", null, null},
                {"raghavan", "Meera Raghavan", "judge@nyayaflow.test", Role.JUDGE, "Principal District & Sessions Judge", null, "ICC"},
                {"kulkarni", "Arvind Kulkarni", "arvind.kulkarni@nyayaflow.test", Role.JUDGE, "Additional District Judge", null, "ICC"},
                {"siddiqui", "Farah Siddiqui", "farah.siddiqui@nyayaflow.test", Role.JUDGE, "Civil Judge (Senior Division)", null, "ICC"},
                {"gill", "Harpreet Gill", "harpreet.gill@nyayaflow.test", Role.JUDGE, "District Judge", null, "SDC"},
                {"rohan", "Rohan Deshpande", "lawyer@nyayaflow.test", Role.LAWYER, "Senior Advocate", "MH/1123/2009", null},
                {"priya", "Priya Nair", "priya.nair@nyayaflow.test", Role.LAWYER, "Advocate", "KL/2231/2014", null},
                {"kabir", "Kabir Malhotra", "kabir.malhotra@nyayaflow.test", Role.LAWYER, "Advocate", "D/874/2011", null},
                {"sana", "Sana Qureshi", "sana.qureshi@nyayaflow.test", Role.LAWYER, "Advocate", "UP/5521/2016", null},
                {"vikram", "Vikram Rathore", "vikram.rathore@nyayaflow.test", Role.LAWYER, "Government Pleader", "RJ/3310/2008", null},
                {"ananya", "Ananya Iyer", "ananya.iyer@nyayaflow.test", Role.LAWYER, "Advocate", "TN/4412/2018", null},
                {"devendra", "Devendra Joshi", "devendra.joshi@nyayaflow.test", Role.LAWYER, "Public Prosecutor", "MP/2207/2005", null},
                {"neha", "Neha Kapoor", "staff@nyayaflow.test", Role.STAFF, "Registrar (Judicial)", null, "ICC"},
                {"suresh", "Suresh Pillai", "suresh.pillai@nyayaflow.test", Role.STAFF, "Court Master", null, "ICC"},
                {"lakshmi", "Lakshmi Rao", "lakshmi.rao@nyayaflow.test", Role.STAFF, "Filing Clerk", null, "SDC"},
                {"mohan", "Mohan Lal", "mohan.lal@nyayaflow.test", Role.STAFF, "Record Keeper", null, "ICC"},
        };
        int index = 0;
        for (Object[] row : roster) {
            User user = new User();
            user.setFullName((String) row[1]);
            user.setEmail((String) row[2]);
            user.setRole((Role) row[3]);
            user.setDesignation((String) row[4]);
            user.setBarRegistrationNumber((String) row[5]);
            user.setCourt(row[6] == null ? null : courtsByCode.get((String) row[6]));
            user.setPhone("+91 98%03d %05d".formatted(110 + index, 41000 + index * 137));
            user.setPasswordHash(hash);
            Instant createdAt = joined.plus(Duration.ofHours(index * 5L));
            user.setCreatedAt(createdAt);
            user.setUpdatedAt(createdAt);
            user.setCredentialsChangedAt(createdAt);
            users.save(user);
            people.put((String) row[0], user);
            index++;
        }

        User admin = people.get("admin");
        people.values().stream().filter(u -> u != admin).forEach(u -> audit.recordAt(u.getCreatedAt(), admin.getId(),
                admin.getFullName(), AuditAction.USER_CREATED, "USER", u.getId(), null,
                "Created " + u.getRole().name().toLowerCase() + " account for " + u.getFullName()));

        User retired = people.get("mohan");
        retired.setActive(false);
        Instant deactivated = clock.instant().minus(Duration.ofDays(100));
        retired.setCredentialsChangedAt(deactivated);
        audit.recordAt(deactivated, admin.getId(), admin.getFullName(), AuditAction.USER_DEACTIVATED, "USER",
                retired.getId(), null, "Deactivated the account of " + retired.getFullName() + " (retired)");
        return people;
    }

    /** A few recent sign-ins so the administrator's activity feed reflects a working court. */
    private void seedRecentSignIns(Map<String, User> people) {
        String[] active = {"neha", "raghavan", "rohan", "kulkarni", "suresh", "priya", "gill", "lakshmi"};
        Instant now = clock.instant();
        for (int i = 0; i < active.length; i++) {
            User user = people.get(active[i]);
            Instant at = now.minus(Duration.ofMinutes(45L + i * 97L));
            user.setLastLoginAt(at);
            audit.recordAt(at, user.getId(), user.getFullName(), AuditAction.USER_LOGIN, "USER", user.getId(), null,
                    user.getFullName() + " signed in");
        }
        audit.recordAt(now.minus(Duration.ofHours(3)), null, "sana.q@nyayaflow.test", AuditAction.USER_LOGIN_FAILED,
                "USER", null, null, "Failed sign-in for sana.q@nyayaflow.test (invalid credentials)");
    }
}
