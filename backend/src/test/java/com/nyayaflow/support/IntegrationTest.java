package com.nyayaflow.support;

import com.nyayaflow.security.JwtService;
import com.nyayaflow.user.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Full application against PostgreSQL. Each test runs in a transaction that is rolled back, and
 * MockMvc executes requests on the test thread, so requests see the test's fixtures.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfig.class, TestData.class})
@ActiveProfiles("test")
@Transactional
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected TestData data;

    @Autowired
    private JwtService jwtService;

    protected String bearer(User user) {
        return "Bearer " + jwtService.issue(user).value();
    }
}
