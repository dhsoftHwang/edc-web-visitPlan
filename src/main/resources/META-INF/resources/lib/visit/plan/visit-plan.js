import React, { useEffect, useState, useRef } from "react";

export default function VisitPlan(props) {

    const namespace = props.namespace;
    const baseResourceURL = props.baseResourceURL;
    const groupId = props.groupId;
    const projectId = props.projectId ? props.projectId : 30001;

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [schedule, setSchedule] = useState(null);      // backend에서 받은 기본 방문들
    const [loading, setLoading] = useState(false);

    // 🔥 Unscheduled visit 목록 (프론트에서만 관리)
    const [unscheduledVisits, setUnscheduledVisits] = useState([]);

    // 🔥 선택된 subjectId 를 보존하기 위한 ref (리렌더링 무시)
    const selectedSubjectIdRef = useRef(null);

    // ============================================================
    // 1) Subject 목록 로드
    // ============================================================
    const loadSubjects = async () => {
        const ns = namespace;

        const url =
            `${baseResourceURL}` +
            `&p_p_resource_id=/edc/getSubjects` +
            `&${ns}groupId=${groupId}` +
            `&${ns}projectId=${projectId}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            const items = data.items || data;
            setSubjects(items);

            // 🔥 리렌더 후에도 선택 유지
            if (selectedSubjectIdRef.current) {
                const subj = items.find(
                    s => s.subjectId == selectedSubjectIdRef.current
                );
                if (subj) {
                    setSelectedSubject(subj);
                }
            }

        } catch (err) {
            console.error("❌ Subject 목록 로딩 실패", err);
        }
    };

    // ============================================================
    // 2) 방문 스케줄 로드 (기본 방문들 + unscheduled)
    // ============================================================
    const loadSchedule = async (subjectId) => {
        if (!subjectId) return;

        setLoading(true);
        selectedSubjectIdRef.current = subjectId;

        const ns = namespace;

        const url =
            `${baseResourceURL}` +
            `&p_p_resource_id=/edc/getSubjectVisitSchedule` +
            `&${ns}subjectId=${subjectId}`;

        try {
            const res = await fetch(url);
            const json = await res.json();

            // 기본 방문만 집어넣기
            const visitsRaw = json.visits || [];

            // 🔥 order 기준으로 한 번 더 정렬 (없으면 0)
            const visits = visitsRaw
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // 🔥🔥 backend에서 내려준 unscheduled visit
            const backendUnscheduled = (json.unscheduledVisits || []).map(u => ({
                tempId: Date.now() + Math.random(), // 리액트 key 용
                name: u.name || "",
                date: u.date || "",                // yyyy-MM-dd
                original: true                     // 기존 데이터임 표시
            }));

            setSchedule({ ...json, visits });

            // 🔥 schedule 로딩 후에도 subject 유지
            const subj = subjects.find(s => s.subjectId == subjectId);
            if (subj) setSelectedSubject(subj);

            // 🔥 기존 + 새로 추가될 unscheduled 모두 저장
            setUnscheduledVisits(backendUnscheduled);

        } catch (err) {
            console.error("❌ visit schedule 로딩 실패", err);
        }

        setLoading(false);
    };


    // subject 선택 핸들러
    const handleSelectSubject = (e) => {
        const sid = Number(e.target.value);

        if (!sid) {
            setSelectedSubject(null);
            setSchedule(null);
            selectedSubjectIdRef.current = null;
            setUnscheduledVisits([]);
            return;
        }

        selectedSubjectIdRef.current = sid;

        const subj = subjects.find((s) => s.subjectId === sid);
        setSelectedSubject(subj);

        loadSchedule(sid);
    };

    // ============================================================
    // 3) Unscheduled Visit 핸들러 (프론트에서만 수정 가능)
    // ============================================================
    // 추가
    const addUnscheduledVisit = () => {
        setUnscheduledVisits(prev => [
            ...prev,
            {
                tempId: Date.now(),    // React key용
                name: "",
                date: ""               // yyyy-MM-dd
            }
        ]);
    };

    // 값 변경
    const updateUnscheduledVisit = (index, field, value) => {
        const updated = [...unscheduledVisits];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setUnscheduledVisits(updated);
    };

    // 삭제
    const removeUnscheduledVisit = (index) => {
        setUnscheduledVisits(prev => prev.filter((_, i) => i !== index));
    };

    // ============================================================
    // 4) 저장
    //  - 기본 방문(visitDefinition 기반)은 read-only로 보여주지만,
    //    save 시 SubjectVisitDefinition 에 모두 저장
    //  - Unscheduled visit 은 offset=99, window=0, anchorType="UNSCHEDULED" 등으로 저장
    // ============================================================
    const saveVisitPlan = async () => {

        if (!selectedSubject) {
            return alert("대상자를 먼저 선택하세요.");
        }

        if (!schedule) {
            return alert("먼저 방문 스케줄을 로드하세요.");
        }

        // 4-1) 기본 방문들 (readonly지만 그대로 저장용 payload로 보냄)
        //      ⚠ order 를 index 로 새로 만들지 않고, backend 에서 내려준 order 유지
        const baseVisitsPayload = (schedule.visits || []).map((v, index) => ({
            ...v,
            order: v.order ?? index,   // v.order 없으면 index 로 fallback
        }));

        // 기본 방문들 중 최대 order 값 계산 (없으면 -1)
        const maxBaseOrder = baseVisitsPayload.length
            ? Math.max(...baseVisitsPayload.map(v => v.order ?? 0))
            : -1;

        // 4-2) Unscheduled visit payload 변환 (backend + frontend 모두)
        const unscheduledPayload = unscheduledVisits.map((u, index) => ({
            visitDefinitionId: 0,
            visitDefinitionCode: "",     // 🔥 unscheduled는 빈 코드 유지
            name: u.name || `Unscheduled ${index + 1}`,
            anchorType: "UNSCHEDULED",
            offset: 99,
            windowMinus: 0,
            windowPlus: 0,
            // 기본 방문들의 최대 order 뒤에 붙이기
            order: maxBaseOrder + 1 + index,
            unscheduledDate: u.date
        }));

        // 4-3) 최종 payload
        const payload = {
            subjectId: selectedSubject.subjectId,
            visits: [
                ...baseVisitsPayload,
                ...unscheduledPayload
            ]
        };

        const url =
            `${baseResourceURL}` +
            `&p_p_resource_id=/edc/saveSubjectVisitDefinition`;

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            console.log("📌 save payload =", payload);
            console.log("📌 save result =", json);

            if (json.success) {
                alert("저장 완료!");
            } else {
                alert("저장 실패");
            }

        } catch (err) {
            console.error("❌ 저장 실패", err);
            alert("저장 중 오류 발생");
        }
    };

    // ============================================================
    // 최초 1회 subjects 로딩
    // ============================================================
    useEffect(() => {
        loadSubjects();
    }, []);

    // ============================================================
    // 화면 렌더링
    // ============================================================
    return (
        <div style={{ padding: "20px" }}>
            <h2>📅 Visit Plan 관리</h2>

            {/* subject 선택 */}
            <div style={{ border: "1px solid #ddd", padding: "16px" }}>
                <h3>대상자 선택</h3>

                <select
                    style={{ width: "100%", padding: "8px" }}
                    value={selectedSubject ? String(selectedSubject.subjectId) : ""}
                    onChange={handleSelectSubject}
                >
                    <option value="">-- 대상자 선택 --</option>

                    {subjects.map((s) => (
                        <option key={s.subjectId} value={String(s.subjectId)}>
                            [{s.serialId}] {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 로딩 표시 */}
            {loading && <div style={{ marginTop: "10px" }}>⏳ 로딩중...</div>}

            {/* 방문 스케줄 (기본 방문 - read only) */}
            {schedule && (
                <div style={{ marginTop: "20px" }}>
                    {/* Subject 정보 박스 */}
                    {schedule && selectedSubject && (
                        <div style={{
                            background: "#f7f8fa",
                            border: "1px solid #e5e7eb",
                            padding: "16px 20px",
                            borderRadius: "8px",
                            marginTop: "20px",
                            marginBottom: "20px"
                        }}>
                            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                                {schedule.subject.name}
                                <span style={{ color: "#555" }}>
                                    (ID: {schedule.subject.subjectId})
                                </span>
                                — 상태: Enrolled
                            </div>

                            <div style={{ marginTop: "6px", color: "#444" }}>
                                기관: 서울대학교병원 / 직함: 환자
                            </div>

                            <div style={{ marginTop: "4px", color: "#444" }}>
                                동의일(Consent Date): {schedule.subject.consentAgreeDate}
                            </div>
                        </div>
                    )}

                    <table style={{ width: "100%", marginTop: "12px", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ borderBottom: "1px solid #ccc", padding: "6px", textAlign: "left" }}>방문명</th>
                                <th style={{ borderBottom: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Anchor</th>
                                <th style={{ borderBottom: "1px solid #ccc", padding: "6px", textAlign: "right" }}>Offset</th>
                                <th style={{ borderBottom: "1px solid #ccc", padding: "6px", textAlign: "right" }}>Window -</th>
                                <th style={{ borderBottom: "1px solid #ccc", padding: "6px", textAlign: "right" }}>Window +</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(schedule.visits || []).map((v, idx) => (
                                <tr key={v.visitDefinitionId || idx}>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "6px" }}>
                                        {v.name}
                                    </td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "6px" }}>
                                        {v.anchorType}
                                    </td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "6px", textAlign: "right" }}>
                                        {v.offset}
                                    </td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "6px", textAlign: "right" }}>
                                        {v.windowMinus}
                                    </td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "6px", textAlign: "right" }}>
                                        {v.windowPlus}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Unscheduled Visit 섹션 */}
            {selectedSubject && (
                <div style={{ marginTop: "30px" }}>
                    <h3>📝 Unscheduled Visit</h3>

                    <button
                        type="button"
                        onClick={addUnscheduledVisit}
                        style={{
                            padding: "6px 12px",
                            marginBottom: "10px",
                            cursor: "pointer"
                        }}
                    >
                        + Unscheduled Visit 추가
                    </button>

                    {unscheduledVisits.length === 0 && (
                        <div style={{ color: "#777" }}>
                            아직 Unscheduled Visit 이 없습니다. 상단 버튼으로 추가하세요.
                        </div>
                    )}

                    {unscheduledVisits.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                            <thead>
                                <tr>
                                    <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>이름</th>
                                    <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>방문 날짜</th>
                                    <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unscheduledVisits.map((u, idx) => (
                                    <tr key={u.tempId}>
                                        <td style={{ borderBottom: "1px solid #eee", padding: "6px" }}>
                                            <input
                                                type="text"
                                                value={u.name}
                                                onChange={(e) =>
                                                    updateUnscheduledVisit(idx, "name", e.target.value)
                                                }
                                                placeholder={`Unscheduled ${idx + 1}`}
                                                style={{ width: "100%" }}
                                            />
                                        </td>
                                        <td style={{ borderBottom: "1px solid #eee", padding: "6px" }}>
                                            <input
                                                type="date"
                                                value={u.date}
                                                onChange={(e) =>
                                                    updateUnscheduledVisit(idx, "date", e.target.value)
                                                }
                                            />
                                        </td>
                                        <td style={{ borderBottom: "1px solid #eee", padding: "6px" }}>
                                            <button
                                                type="button"
                                                onClick={() => removeUnscheduledVisit(idx)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* 저장 버튼 (대상자 + 스케줄 있을 때만) */}
            {selectedSubject && schedule && (
                <div style={{ marginTop: "20px" }}>
                    <button
                        onClick={saveVisitPlan}
                        style={{
                            padding: "10px 20px",
                            background: "#007aff",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                        }}
                    >
                        저장하기
                    </button>
                </div>
            )}
        </div>
    );
}
