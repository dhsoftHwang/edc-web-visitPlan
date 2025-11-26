import React, { useState } from "react";
import ClayTable from "@clayui/table";

export default function VisitPlan() {
    const [subjects] = useState([
        { id: 1, name: "김철수", serialId: "SUB001" },
        { id: 2, name: "이영희", serialId: "SUB002" }
    ]);

    const [selectedSubject, setSelectedSubject] = useState(null);

    const [visitEvents] = useState([
        { id: 1, name: "Baseline", planDate: "2025-01-01", eventDate: "-", deviation: "-" },
        { id: 2, name: "12w", planDate: "2025-03-25", eventDate: "-", deviation: "-" },
    ]);

    return (
        <div style={{ display: "flex", gap: "20px" }}>
            
            {/* LEFT: Subject 리스트 */}
            <div style={{ width: "300px" }}>
                <h3>연구대상자</h3>

                <ClayTable borderless hover striped>
                    <ClayTable.Body>
                        {subjects.map(s => (
                            <ClayTable.Row
                                key={s.id}
                                onClick={() => setSelectedSubject(s)}
                                style={{
                                    cursor: "pointer",
                                    backgroundColor: selectedSubject?.id === s.id ? "#e7f1ff" : ""
                                }}
                            >
                                <ClayTable.Cell>{s.serialId}</ClayTable.Cell>
                                <ClayTable.Cell>{s.name}</ClayTable.Cell>
                            </ClayTable.Row>
                        ))}
                    </ClayTable.Body>
                </ClayTable>
            </div>


            {/* RIGHT: 방문 계획 */}
            <div style={{ flex: 1 }}>
                <h3>방문 계획</h3>

                {!selectedSubject && <div>대상자를 선택하세요.</div>}

                {selectedSubject && (
                    <>
                        <div
                          style={{
                              padding: "12px",
                              background: "#f8f9fa",
                              borderRadius: "8px",
                              marginBottom: "15px",
                          }}
                        >
                            선택된 대상자: <strong>{selectedSubject.serialId} / {selectedSubject.name}</strong>
                        </div>

                        <ClayTable borderless hover striped>
                            <ClayTable.Head>
                                <ClayTable.Row>
                                    <ClayTable.Cell headingCell>방문명</ClayTable.Cell>
                                    <ClayTable.Cell headingCell>예정일</ClayTable.Cell>
                                    <ClayTable.Cell headingCell>실시일</ClayTable.Cell>
                                    <ClayTable.Cell headingCell>Deviation</ClayTable.Cell>
                                </ClayTable.Row>
                            </ClayTable.Head>

                            <ClayTable.Body>
                                {visitEvents.map(v => (
                                    <ClayTable.Row key={v.id}>
                                        <ClayTable.Cell>{v.name}</ClayTable.Cell>
                                        <ClayTable.Cell>{v.planDate}</ClayTable.Cell>
                                        <ClayTable.Cell>{v.eventDate}</ClayTable.Cell>
                                        <ClayTable.Cell>{v.deviation}</ClayTable.Cell>
                                    </ClayTable.Row>
                                ))}
                            </ClayTable.Body>
                        </ClayTable>
                    </>
                )}
            </div>
        </div>
    );
}
