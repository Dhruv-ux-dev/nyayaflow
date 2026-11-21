package com.nyayaflow.seed;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseType;
import com.nyayaflow.cases.PartySide;
import com.nyayaflow.cases.PartyType;
import com.nyayaflow.document.DocumentType;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.order.OrderType;

/**
 * Declarative description of a demo case and its history. Days are offsets from today (negative is
 * the past), so the demo always looks current no matter when it is started.
 */
final class CaseScript {

    final CaseType type;
    final String title;
    String description;
    CasePriority priority = CasePriority.NORMAL;
    String courtCode;
    String roomName;
    int filedDay;
    String registeredBy;
    final List<PartySeed> parties = new ArrayList<>();
    final List<CounselSeed> counsel = new ArrayList<>();
    private final List<Event> events = new ArrayList<>();

    private CaseScript(CaseType type, String title) {
        this.type = type;
        this.title = title;
    }

    static CaseScript of(CaseType type, String title) {
        return new CaseScript(type, title);
    }

    CaseScript about(String description) {
        this.description = description;
        return this;
    }

    CaseScript priority(CasePriority priority) {
        this.priority = priority;
        return this;
    }

    CaseScript filed(int day, String courtCode, String roomName, String registeredBy) {
        this.filedDay = day;
        this.courtCode = courtCode;
        this.roomName = roomName;
        this.registeredBy = registeredBy;
        return this;
    }

    CaseScript petitioner(String name, PartyType type, String address) {
        parties.add(new PartySeed(PartySide.PETITIONER, type, name, address));
        return this;
    }

    CaseScript respondent(String name, PartyType type, String address) {
        parties.add(new PartySeed(PartySide.RESPONDENT, type, name, address));
        return this;
    }

    CaseScript counsel(String lawyer, PartySide side, boolean lead) {
        counsel.add(new CounselSeed(lawyer, side, lead));
        return this;
    }

    CaseScript assign(int day, String judge, String by) {
        events.add(new Assign(day, judge, by));
        return this;
    }

    CaseScript document(int day, DocumentType type, String title, String uploader, String description,
                        String... body) {
        events.add(new Doc(day, type, title, uploader, description, List.of(body)));
        return this;
    }

    CaseScript held(int day, String time, HearingType type, String purpose, String outcome, String proceedings) {
        events.add(new HearingEvent(day, LocalTime.parse(time), type, HearingStatus.COMPLETED, purpose, outcome,
                proceedings));
        return this;
    }

    CaseScript adjourned(int day, String time, HearingType type, String purpose, String outcome, String proceedings) {
        events.add(new HearingEvent(day, LocalTime.parse(time), type, HearingStatus.ADJOURNED, purpose, outcome,
                proceedings));
        return this;
    }

    CaseScript listed(int day, String time, HearingType type, String purpose) {
        events.add(new HearingEvent(day, LocalTime.parse(time), type, HearingStatus.SCHEDULED, purpose, null, null));
        return this;
    }

    CaseScript order(int day, OrderType type, String title, String content) {
        events.add(new OrderEvent(day, type, title, content));
        return this;
    }

    CaseScript status(int day, CaseStatus to, String note, String actor) {
        events.add(new StatusEvent(day, to, note, actor));
        return this;
    }

    CaseScript deadline(int dueDay, String title, String description, CasePriority priority, String assignee,
                        boolean completed, String creator) {
        events.add(new DeadlineEvent(dueDay, title, description, priority, assignee, completed, creator,
                Math.max(filedDay + 1, Math.min(dueDay - 14, -1))));
        return this;
    }

    /** Events in the order they happened; same-day events keep their declaration order. */
    List<Event> timeline() {
        return events.stream().sorted(Comparator.comparingInt(Event::sortDay)).toList();
    }

    record PartySeed(PartySide side, PartyType type, String name, String address) {
    }

    record CounselSeed(String lawyer, PartySide side, boolean lead) {
    }

    sealed interface Event permits Assign, Doc, HearingEvent, OrderEvent, StatusEvent, DeadlineEvent {
        int day();

        default int sortDay() {
            return day();
        }
    }

    record Assign(int day, String judge, String by) implements Event {
    }

    record Doc(int day, DocumentType type, String title, String uploader, String description, List<String> body)
            implements Event {
    }

    record HearingEvent(int day, LocalTime time, HearingType type, HearingStatus status, String purpose,
                        String outcome, String proceedings) implements Event {
    }

    record OrderEvent(int day, OrderType type, String title, String content) implements Event {
    }

    record StatusEvent(int day, CaseStatus to, String note, String actor) implements Event {
    }

    record DeadlineEvent(int day, String title, String description, CasePriority priority, String assignee,
                         boolean completed, String creator, int createdDay) implements Event {
        @Override
        public int sortDay() {
            return createdDay;
        }
    }
}
