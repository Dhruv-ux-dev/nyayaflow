package com.nyayaflow.court;

import java.util.ArrayList;
import java.util.List;

import com.nyayaflow.common.AuditableEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "courts")
public class Court extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    private String address;

    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "court", cascade = CascadeType.ALL)
    @OrderBy("name asc")
    private List<Courtroom> courtrooms = new ArrayList<>();

    public Courtroom addCourtroom(String name, String floor) {
        Courtroom room = new Courtroom();
        room.setCourt(this);
        room.setName(name);
        room.setFloor(floor);
        courtrooms.add(room);
        return room;
    }
}
