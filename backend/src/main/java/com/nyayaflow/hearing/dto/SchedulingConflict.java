package com.nyayaflow.hearing.dto;

import java.time.LocalDateTime;
import java.util.List;

/** An existing hearing that overlaps a requested slot, and whether the judge, the room, or both clash. */
public record SchedulingConflict(
        Long hearingId,
        Long caseId,
        String caseNumber,
        LocalDateTime scheduledAt,
        LocalDateTime endsAt,
        String judgeName,
        String courtroomName,
        List<Reason> reasons) {

    public enum Reason {
        JUDGE_BUSY,
        COURTROOM_BUSY
    }
}
