package com.nyayaflow.document;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.nyayaflow.common.ApiException;
import com.nyayaflow.config.NyayaFlowProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores uploaded files on the local file system. Files are saved under generated names (never the
 * client's file name), only allow-listed types are accepted, and the leading bytes must match the
 * declared extension so that, for example, an executable renamed to .pdf is rejected.
 */
@Service
public class FileStorageService {

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "pdf", "application/pdf",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "odt", "application/vnd.oasis.opendocument.text",
            "rtf", "application/rtf",
            "txt", "text/plain",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png");

    private static final Map<String, byte[]> SIGNATURES = Map.of(
            "pdf", new byte[] {'%', 'P', 'D', 'F'},
            "png", new byte[] {(byte) 0x89, 'P', 'N', 'G'},
            "jpg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
            "jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
            "docx", new byte[] {'P', 'K', 3, 4},
            "odt", new byte[] {'P', 'K', 3, 4},
            "doc", new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0},
            "rtf", new byte[] {'{', '\\', 'r', 't', 'f'});

    private final Path root;
    private final List<String> allowedExtensions;

    public FileStorageService(NyayaFlowProperties properties) {
        this.root = properties.storage().location().toAbsolutePath().normalize();
        this.allowedExtensions = properties.storage().allowedExtensions().stream()
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .toList();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new StorageException("Could not create the document storage directory " + root, e);
        }
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "Choose a non-empty file to upload.");
        }
        String originalName = sanitizeFilename(file.getOriginalFilename());
        try (InputStream in = file.getInputStream()) {
            return write(in, originalName);
        } catch (IOException e) {
            throw new StorageException("Could not read the uploaded file", e);
        }
    }

    /** Stores generated content (used by the demo seeder). */
    public StoredFile store(byte[] content, String filename) {
        try (InputStream in = new java.io.ByteArrayInputStream(content)) {
            return write(in, sanitizeFilename(filename));
        } catch (IOException e) {
            throw new StorageException("Could not store generated file", e);
        }
    }

    /** Removes a freshly stored file if the surrounding transaction rolls back, so no orphans remain. */
    public void deleteIfRolledBack(String storageKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try {
                        Files.deleteIfExists(resolve(storageKey));
                    } catch (IOException ignored) {
                        // best effort clean-up
                    }
                }
            }
        });
    }

    public Resource load(String storageKey) {
        Path path = resolve(storageKey);
        if (!Files.isReadable(path)) {
            throw ApiException.notFound("File", "for this document");
        }
        return new FileSystemResource(path);
    }

    public static boolean isInlineViewable(String contentType) {
        return contentType.equals("application/pdf") || contentType.startsWith("image/");
    }

    private StoredFile write(InputStream in, String originalName) throws IOException {
        String extension = extensionOf(originalName);
        if (!allowedExtensions.contains(extension)) {
            throw ApiException.badRequest("FILE_TYPE_NOT_ALLOWED",
                    "Files of type ." + extension + " are not accepted. Allowed: " + String.join(", ", allowedExtensions) + ".");
        }
        LocalDate today = LocalDate.now();
        String storageKey = "%d/%02d/%s.%s".formatted(today.getYear(), today.getMonthValue(), UUID.randomUUID(), extension);
        Path target = resolve(storageKey);
        Files.createDirectories(target.getParent());

        MessageDigest digest = sha256();
        try (DigestInputStream digestIn = new DigestInputStream(in, digest)) {
            Files.copy(digestIn, target, StandardCopyOption.REPLACE_EXISTING);
        }
        long size = Files.size(target);
        if (size == 0 || !hasExpectedSignature(target, extension)) {
            Files.deleteIfExists(target);
            throw ApiException.badRequest("FILE_CONTENT_MISMATCH",
                    "The file's contents do not match its ." + extension + " extension.");
        }
        return new StoredFile(storageKey, originalName, CONTENT_TYPES.getOrDefault(extension, "application/octet-stream"),
                size, HexFormat.of().formatHex(digest.digest()));
    }

    private Path resolve(String storageKey) {
        Path path = root.resolve(storageKey).normalize();
        if (!path.startsWith(root)) {
            throw ApiException.badRequest("INVALID_PATH", "Invalid storage path.");
        }
        return path;
    }

    private static boolean hasExpectedSignature(Path file, String extension) throws IOException {
        byte[] expected = SIGNATURES.get(extension);
        if (expected == null) {
            return true;
        }
        byte[] head = new byte[expected.length];
        try (InputStream in = Files.newInputStream(file)) {
            if (in.readNBytes(head, 0, head.length) < head.length) {
                return false;
            }
        }
        return java.util.Arrays.equals(head, expected);
    }

    static String sanitizeFilename(String filename) {
        String name = StringUtils.getFilename(StringUtils.cleanPath(filename == null ? "" : filename));
        if (name == null || name.isBlank()) {
            name = "document";
        }
        name = name.replaceAll("[\\p{Cntrl}\"\\\\/:*?<>|]", "_").trim();
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static String extensionOf(String filename) {
        String extension = StringUtils.getFilenameExtension(filename);
        return extension == null ? "" : extension.toLowerCase(Locale.ROOT);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public record StoredFile(String storageKey, String originalFilename, String contentType, long sizeBytes,
                             String sha256) {
    }
}
