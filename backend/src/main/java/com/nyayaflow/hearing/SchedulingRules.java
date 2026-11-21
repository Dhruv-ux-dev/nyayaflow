package com.nyayaflow.hearing;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.nyayaflow.common.ApiException;
import com.nyayaflow.config.NyayaFlowProperties;
import com.nyayaflow.hearing.dto.SchedulingConflict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Validation for hearing slots: they must be in the future, on a working day and within court hours,
 * and must not overlap another scheduled hearing of the same judge or in the same courtroom.
 */
@Component
public class SchedulingRules {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final HearingRepository hearings;
    private final NyayaFlowProperties.Scheduling settings;
    private final Clock clock;

    public SchedulingRules(HearingRepository hearings, NyayaFlowProperties properties, Clock clock) {
        this.hearings = hearings;
        this.settings = properties.scheduling();
        this.clock = clock;
    }

    public int durationOrDefault(Integer requested) {
        return requested == null ? settings.defaultHearingMinutes() : requested;
    }

    public void validateSlot(LocalDateTime start, int durationMinutes) {
        if (!start.isAfter(LocalDateTime.now(clock))) {
            throw ApiException.badRequest("HEARING_IN_PAST", "Hearings can only be scheduled for a future date and time.");
        }
        if (start.getDayOfWeek() == DayOfWeek.SUNDAY) {
            throw ApiException.badRequest("NON_WORKING_DAY", "Courts do not sit on Sundays. Choose another date.");
        }
        LocalTime startTime = start.toLocalTime();
        LocalDateTime end = start.plusMinutes(durationMinutes);
        if (startTime.isBefore(settings.courtDayStart()) || !end.toLocalDate().equals(start.toLocalDate())
                || end.toLocalTime().isAfter(settings.courtDayEnd())) {
            throw ApiException.badRequest("OUTSIDE_COURT_HOURS", "Hearings must fall within court hours ("
                    + settings.courtDayStart().format(TIME) + "–" + settings.courtDayEnd().format(TIME) + ").");
        }
    }

    public List<SchedulingConflict> findConflicts(Long judgeId, Long courtroomId, LocalDateTime start,
                                                  int durationMinutes, Long excludeHearingId) {
        LocalDateTime end = start.plusMinutes(durationMinutes);
        LocalDateTime dayStart = start.toLocalDate().atStartOfDay();
        List<SchedulingConflict> conflicts = new ArrayList<>();
        for (Hearing other : hearings.findScheduledForJudgeOrCourtroom(judgeId, courtroomId, dayStart,
                dayStart.plusDays(1))) {
            if (Objects.equals(other.getId(), excludeHearingId)) {
                continue;
            }
            boolean overlaps = other.getScheduledAt().isBefore(end) && other.endsAt().isAfter(start);
            if (!overlaps) {
                continue;
            }
            List<SchedulingConflict.Reason> reasons = new ArrayList<>();
            if (other.getJudge() != null && Objects.equals(other.getJudge().getId(), judgeId)) {
                reasons.add(SchedulingConflict.Reason.JUDGE_BUSY);
            }
            if (other.getCourtroom() != null && Objects.equals(other.getCourtroom().getId(), courtroomId)) {
                reasons.add(SchedulingConflict.Reason.COURTROOM_BUSY);
            }
            conflicts.add(new SchedulingConflict(other.getId(), other.getCourtCase().getId(),
                    other.getCourtCase().getCaseNumber(), other.getScheduledAt(), other.endsAt(),
                    other.getJudge() == null ? null : other.getJudge().getFullName(),
                    other.getCourtroom() == null ? null : other.getCourtroom().getName(), reasons));
        }
        return conflicts;
    }

    /** Fails with 409 and the list of clashes, unless the user explicitly chose to override. */
    public void ensureNoConflicts(Long judgeId, Long courtroomId, LocalDateTime start, int durationMinutes,
                                  Long excludeHearingId, boolean override) {
        if (override) {
            return;
        }
        List<SchedulingConflict> conflicts = findConflicts(judgeId, courtroomId, start, durationMinutes,
                excludeHearingId);
        if (!conflicts.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "SCHEDULING_CONFLICT",
                    "The judge or courtroom is already booked at this time.", conflicts);
        }
    }
}
