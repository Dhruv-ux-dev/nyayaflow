package com.nyayaflow.document;

/** Unexpected I/O failure in the file store (disk full, permissions). */
public class StorageException extends RuntimeException {

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
