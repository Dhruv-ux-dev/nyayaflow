package com.nyayaflow.document;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.court.Court;
import com.nyayaflow.support.IntegrationTest;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;

class DocumentIntegrationTest extends IntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\n% test document\n".getBytes(StandardCharsets.ISO_8859_1);

    private User lawyer;
    private CaseDetailResponse ownCase;
    private CaseDetailResponse otherCase;

    @BeforeEach
    void setUp() {
        Court court = data.court();
        User staff = data.user(Role.STAFF, court);
        User judge = data.user(Role.JUDGE, court);
        lawyer = data.user(Role.LAWYER, court);
        ownCase = data.registerCase(staff, court, judge, lawyer);
        otherCase = data.registerCase(staff, court, judge);
    }

    @Test
    void counselCanFileInTheirCaseAndDownloadTheExactFile() throws Exception {
        String response = mvc.perform(multipart("/api/cases/" + ownCase.id() + "/documents")
                        .file(new MockMultipartFile("file", "../../etc/affidavit.pdf", "application/pdf", PDF))
                        .param("documentType", "AFFIDAVIT")
                        .header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("affidavit"))
                .andExpect(jsonPath("$.versions[0].originalFilename").value("affidavit.pdf"))
                .andExpect(jsonPath("$.versions[0].sha256").value(Matchers.hasLength(64)))
                .andReturn().getResponse().getContentAsString();
        long id = Long.parseLong(response.replaceAll("(?s)^\\{\"id\":(\\d+).*", "$1"));

        mvc.perform(get("/api/documents/" + id + "/download").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.startsWith("attachment")))
                .andExpect(content().bytes(PDF));
    }

    @Test
    void filesMustBeAnAllowedTypeWhoseContentMatchesItsExtension() throws Exception {
        mvc.perform(multipart("/api/cases/" + ownCase.id() + "/documents")
                        .file(new MockMultipartFile("file", "tool.exe", "application/octet-stream", new byte[] {'M', 'Z', 0, 0}))
                        .param("documentType", "OTHER")
                        .header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));

        mvc.perform(multipart("/api/cases/" + ownCase.id() + "/documents")
                        .file(new MockMultipartFile("file", "renamed.pdf", "application/pdf", new byte[] {'M', 'Z', 0, 0}))
                        .param("documentType", "OTHER")
                        .header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_CONTENT_MISMATCH"));
    }

    @Test
    void counselCannotFileInCasesTheyDoNotAppearIn() throws Exception {
        mvc.perform(multipart("/api/cases/" + otherCase.id() + "/documents")
                        .file(new MockMultipartFile("file", "a.pdf", "application/pdf", PDF))
                        .param("documentType", "OTHER")
                        .header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isForbidden());
    }
}
