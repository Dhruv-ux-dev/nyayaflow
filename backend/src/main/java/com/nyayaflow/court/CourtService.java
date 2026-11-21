package com.nyayaflow.court;

import java.util.List;
import java.util.Locale;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.Texts;
import com.nyayaflow.court.CourtDtos.CourtRequest;
import com.nyayaflow.court.CourtDtos.CourtResponse;
import com.nyayaflow.court.CourtDtos.CourtroomRequest;
import com.nyayaflow.court.CourtDtos.CourtroomResponse;
import com.nyayaflow.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourtService {

    private final CourtRepository courts;
    private final CourtroomRepository courtrooms;
    private final AuditService audit;

    public CourtService(CourtRepository courts, CourtroomRepository courtrooms, AuditService audit) {
        this.courts = courts;
        this.courtrooms = courtrooms;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<CourtResponse> list() {
        return courts.findAllByOrderByNameAsc().stream().map(CourtResponse::from).toList();
    }

    @Transactional
    public CourtResponse create(CourtRequest request, AuthenticatedUser actor) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (courts.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("COURT_CODE_IN_USE", "Another court already uses the code " + code + ".");
        }
        Court court = new Court();
        court.setCode(code);
        apply(court, request);
        courts.save(court);
        audit.record(actor, AuditAction.COURT_CREATED, "COURT", court.getId(), null, "Added court " + court.getName());
        return CourtResponse.from(court);
    }

    @Transactional
    public CourtResponse update(Long id, CourtRequest request, AuthenticatedUser actor) {
        Court court = courts.findById(id).orElseThrow(() -> ApiException.notFound("Court", id));
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (!court.getCode().equalsIgnoreCase(code) && courts.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("COURT_CODE_IN_USE", "Another court already uses the code " + code + ".");
        }
        court.setCode(code);
        apply(court, request);
        audit.record(actor, AuditAction.COURT_UPDATED, "COURT", court.getId(), null,
                "Updated court " + court.getName());
        return CourtResponse.from(court);
    }

    @Transactional
    public CourtroomResponse addCourtroom(Long courtId, CourtroomRequest request, AuthenticatedUser actor) {
        Court court = courts.findById(courtId).orElseThrow(() -> ApiException.notFound("Court", courtId));
        String name = request.name().trim();
        if (courtrooms.existsByCourtIdAndNameIgnoreCase(courtId, name)) {
            throw ApiException.conflict("COURTROOM_EXISTS", "This court already has a courtroom named " + name + ".");
        }
        Courtroom room = court.addCourtroom(name, Texts.clean(request.floor()));
        room.setActive(request.active());
        courtrooms.save(room);
        audit.record(actor, AuditAction.COURTROOM_CREATED, "COURTROOM", room.getId(), null,
                "Added " + room.getName() + " to " + court.getName());
        return CourtroomResponse.from(room);
    }

    @Transactional
    public CourtroomResponse updateCourtroom(Long id, CourtroomRequest request, AuthenticatedUser actor) {
        Courtroom room = courtrooms.findById(id).orElseThrow(() -> ApiException.notFound("Courtroom", id));
        String name = request.name().trim();
        if (!room.getName().equalsIgnoreCase(name)
                && courtrooms.existsByCourtIdAndNameIgnoreCase(room.getCourt().getId(), name)) {
            throw ApiException.conflict("COURTROOM_EXISTS", "This court already has a courtroom named " + name + ".");
        }
        room.setName(name);
        room.setFloor(Texts.clean(request.floor()));
        room.setActive(request.active());
        audit.record(actor, AuditAction.COURTROOM_UPDATED, "COURTROOM", room.getId(), null,
                "Updated " + room.getName() + " (" + room.getCourt().getName() + ")");
        return CourtroomResponse.from(room);
    }

    private static void apply(Court court, CourtRequest request) {
        court.setName(request.name().trim());
        court.setCity(request.city().trim());
        court.setAddress(Texts.clean(request.address()));
        court.setActive(request.active());
    }
}
