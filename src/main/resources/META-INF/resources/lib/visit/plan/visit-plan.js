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
            const res = await fetch(url, { credentials: "include" });
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
            const res = await fetch(url, { credentials: "include" });
            const json = await res.json();

            // 기본 방문만 집어넣기
            const visitsRaw = json.visits || [];

            // 🔥 order 기준으로 한 번 더 정렬 (없으면 0)
            const visits = visitsRaw
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // 🔥 backend에서 내려준 unscheduled visit
            const backendUnscheduled = (json.unscheduledVisits || []).map(u => ({
                tempId: Date.now() + Math.random(), // 리액트 key 용
                name: u.name || "",
                date: u.date || "",                // yyyy-MM-dd
                original: true                     // 기존 데이터임 표시
            }));

            setSchedule({ ...json, visits });

            // schedule 로딩 후에도 subject 유지
            const subj = subjects.find(s => s.subjectId == subjectId);
            if (subj) setSelectedSubject(subj);

            // 기존 + 새로 추가될 unscheduled 모두 저장
            setUnscheduledVisits(backendUnscheduled);
        } catch (err) {
            console.error("❌ visit schedule 로딩 실패", err);
        }

        setLoading(false);
    };

    // subject 선택 핸들러 (select용)
    const handleSelectSubject = (e) => {
        const sid = Number(e.target.value);
        onSelectSubjectId(sid);
    };

    // row 클릭/셀렉트 공용 함수
    const onSelectSubjectId = (sid) => {
        if (!sid) {
            setSelectedSubject(null);
            setSchedule(null);
            selectedSubjectIdRef.current = null;
            setUnscheduledVisits([]);
            return;
        }

        selectedSubjectIdRef.current = sid;

        const subj = subjects.find((s) => s.subjectId === sid);
        setSelectedSubject(subj || null);

        loadSchedule(sid);
    };

    // ============================================================
    // 3) Unscheduled Visit 핸들러 (프론트에서만 수정 가능)
    // ============================================================
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

    const updateUnscheduledVisit = (index, field, value) => {
        const updated = [...unscheduledVisits];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setUnscheduledVisits(updated);
    };

    const removeUnscheduledVisit = (index) => {
        setUnscheduledVisits(prev => prev.filter((_, i) => i !== index));
    };

    // ============================================================
    // 4) 저장
    // ============================================================
    const saveVisitPlan = async () => {
        if (!selectedSubject) {
            return alert("대상자를 먼저 선택하세요.");
        }

        if (!schedule) {
            return alert("먼저 방문 스케줄을 로드하세요.");
        }

        // 4-1) 기본 방문들
        const baseVisitsPayload = (schedule.visits || []).map((v, index) => ({
            ...v,
            order: v.order ?? index,   // v.order 없으면 index 로 fallback
        }));

        // 기본 방문들 중 최대 order 값 계산 (없으면 -1)
        const maxBaseOrder = baseVisitsPayload.length
            ? Math.max(...baseVisitsPayload.map(v => v.order ?? 0))
            : -1;

        // 4-2) Unscheduled visit payload 변환
        const unscheduledPayload = unscheduledVisits.map((u, index) => ({
            visitDefinitionId: 0,
            visitDefinitionCode: "",
            name: u.name || `Unscheduled ${index + 1}`,
            anchorType: "UNSCHEDULED",
            offset: 99,
            windowMinus: 0,
            windowPlus: 0,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================================
    // 화면 렌더링
    // ============================================================
    return (
        <>
            <style>{css}</style>

            <div className="layout">
                {/* 왼쪽: 대상자 목록 */}
                <aside className="left">
                    <div className="left-title">■ 대상자 목록</div>

                    <div className="mb-2">
                        <div className="inline-label">대상자 선택</div>
                        <select
                            className="form-control"
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

                    <div className="count-bar">
                        <div>총 대상자 수: <b>{subjects.length}</b></div>
                        {selectedSubject && (
                            <div className="text-secondary small">
                                선택: [{selectedSubject.serialId}] {selectedSubject.name}
                            </div>
                        )}
                    </div>

                    <div className="left-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>대상자ID</th>
                                    <th>호칭</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map(s => {
                                    const active = selectedSubject && selectedSubject.subjectId === s.subjectId;
                                    return (
                                        <tr
                                            key={s.subjectId}
                                            className={active ? "row-active" : ""}
                                            onClick={() => onSelectSubjectId(s.subjectId)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>{s.serialId}</td>
                                            <td>{s.name}</td>
                                        </tr>
                                    );
                                })}
                                {subjects.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-center text-secondary">
                                            조회된 대상자가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </aside>

                {/* 오른쪽: 방문 계획 */}
                <section className="right">
                    {/* 상단 정보 바 */}
                    <div className="info">
                        {selectedSubject ? (
                            <div className="info-row info-row-3">
                                <div className="label">대상자</div>
                                <div className="value">
                                    [{selectedSubject.serialId}] {selectedSubject.name}
                                </div>
                                <div className="label">Subject ID</div>
                                <div className="value">{selectedSubject.subjectId}</div>
                                <div className="label">Enrolled 상태</div>
                                <div className="value">Enrolled</div>
                            </div>
                        ) : (
                            <div className="empty-hint">
                                왼쪽 목록에서 대상자를 선택해 주세요.
                            </div>
                        )}
                    </div>

                    {/* 로딩 표시 */}
                    {loading && (
                        <div className="loading-bar">
                            ⏳ 방문 스케줄을 불러오는 중...
                        </div>
                    )}

                    {/* 기본 방문 스케줄 */}
                    {schedule && (
                        <div className="tab-body">
                            <h2 className="tab-title">기본 방문 스케줄</h2>

                            {/* consent 정보 등 */}
                            {schedule.subject && (
                                <div className="card">
                                    <div className="card-line">
                                        <span className="label-inline">동의일(Consent Date)</span>
                                        <span className="value-inline">
                                            {schedule.subject.consentAgreeDate || "-"}
                                        </span>
                                    </div>
                                    <div className="card-line">
                                        <span className="label-inline">기관</span>
                                        <span className="value-inline">
                                            {/* 실제 기관명 내려오면 바꿔쓰기 */}
                                            {schedule.subject.institutionName || "—"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="schedule-wrap">
                                <table className="basic-table">
                                    <thead>
                                        <tr>
                                            <th>방문명</th>
                                            <th>Anchor</th>
                                            <th className="text-right">Offset</th>
                                            <th className="text-right">Window -</th>
                                            <th className="text-right">Window +</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(schedule.visits || []).map((v, idx) => (
                                            <tr key={v.visitDefinitionId || idx}>
                                                <td>{v.name}</td>
                                                <td>{v.anchorType}</td>
                                                <td className="text-right">{v.offset}</td>
                                                <td className="text-right">{v.windowMinus}</td>
                                                <td className="text-right">{v.windowPlus}</td>
                                            </tr>
                                        ))}
                                        {(schedule.visits || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center text-secondary">
                                                    등록된 기본 방문이 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Unscheduled Visit 섹션 */}
                    {selectedSubject && (
                        <div className="tab-body">
                            <div className="card card-unscheduled">
                                <div className="card-header-row">
                                    <h3 className="tab-title">Unscheduled Visit</h3>
                                    <button type="button" onClick={addUnscheduledVisit}>
                                        + Unscheduled Visit 추가
                                    </button>
                                </div>

                                {unscheduledVisits.length === 0 && (
                                    <div className="empty-hint">
                                        아직 Unscheduled Visit 이 없습니다. 상단 버튼으로 추가하세요.
                                    </div>
                                )}

                                {unscheduledVisits.length > 0 && (
                                    <div className="schedule-wrap schedule-wrap-inner">
                                        <table className="basic-table">
                                            <thead>
                                                <tr>
                                                    <th>이름</th>
                                                    <th>방문 날짜</th>
                                                    <th>삭제</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unscheduledVisits.map((u, idx) => (
                                                    <tr key={u.tempId}>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                value={u.name}
                                                                onChange={(e) =>
                                                                    updateUnscheduledVisit(
                                                                        idx,
                                                                        "name",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder={`Unscheduled ${idx + 1}`}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                value={u.date}
                                                                onChange={(e) =>
                                                                    updateUnscheduledVisit(
                                                                        idx,
                                                                        "date",
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                className="btn-danger-outline"
                                                                onClick={() => removeUnscheduledVisit(idx)}
                                                            >
                                                                삭제
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 저장 버튼 */}
                    {selectedSubject && schedule && (
                        <div className="action-bar">
                            <button type="button" onClick={saveVisitPlan}>
                                저장하기
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

// AddVisit / VisitDefinition 과 통일된 스타일
const css = `
.layout { display:flex; gap:12px; }
.left {
  width: 380px;
  border:1px solid #e5e7eb;
  border-radius:8px;
  background:#fafbfc;
  display:flex;
  flex-direction:column;
  padding:10px;
  font-size:0.95rem;
  line-height:1.4;
}
.left-title {
  font-weight:600;
  color:#0b5fff;
  margin-bottom:8px;
  font-size:1.05rem;
}
.count-bar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin:6px 0 8px;
  font-size:0.9rem;
}
.left-table {
  overflow:auto;
  max-height:360px;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:6px;
}
.left-table table {
  width:100%;
  border-collapse:collapse;
}
.left-table table th,
.left-table table td {
  font-size:0.9rem;
  line-height:1.45;
  padding:8px 10px;
  border-bottom:1px solid #f1f5f9;
}
.left-table table thead {
  background:#f8fafc;
}
.left-table table th {
  font-weight:600;
  color:#0f172a;
}
.row-active { background:#e7f3ff; }

.right {
  flex:1;
  border:1px solid #e5e7eb;
  border-radius:8px;
  background:#fff;
  display:flex;
  flex-direction:column;
  min-width:0;
}

/* 상단 정보 바 */
.info {
  display:grid;
  gap:10px;
  padding:12px 10px;
  border-bottom:1px solid #e5e7eb;
  background:#f8fafc;
}
.info-row {
  display:grid;
  align-items:center;
  column-gap:12px;
  row-gap:6px;
}
.info-row-3 {
  grid-template-columns:100px 1fr 100px 1fr 130px 1fr;
}
.label {
  color:#475569;
  text-align:right;
  font-size:0.9rem;
}
.value {
  color:#0f172a;
  font-weight:600;
  font-size:0.95rem;
}

/* 탭/섹션 공통 */
.tab-body {
  padding:10px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.tab-title {
  font-size:1rem;
  font-weight:600;
  margin:0 0 4px;
}
.empty-hint {
  padding:12px;
  border-radius:6px;
  background:#f8fafc;
  color:#475569;
  font-size:0.9rem;
}

/* 로딩 바 */
.loading-bar {
  padding:8px 12px;
  font-size:0.9rem;
  color:#475569;
}

/* 테이블 공통 */
.schedule-wrap {
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:6px;
  max-height:320px;
  overflow-y:auto;
  overflow-x:auto;
}
.schedule-wrap-inner {
  max-height:260px;
}
.basic-table {
  width:100%;
  border-collapse:collapse;
  font-size:0.9rem;
}
.basic-table thead {
  background:#f8fafc;
}
.basic-table th,
.basic-table td {
  padding:8px 10px;
  border-bottom:1px solid #e5e7eb;
}
.basic-table tbody tr:hover {
  background:#f9fafb;
}

/* 카드 */
.card {
  border:1px solid #e5e7eb;
  border-radius:8px;
  padding:8px 10px;
  background:#f9fafb;
  font-size:0.9rem;
}
.card-line {
  display:flex;
  justify-content:flex-start;
  gap:6px;
  margin-bottom:4px;
}
.label-inline {
  color:#64748b;
  min-width:130px;
}
.value-inline {
  color:#0f172a;
  font-weight:600;
}
.card-unscheduled {
  display:flex;
  flex-direction:column;
  gap:8px;
}
.card-header-row {
  display:flex;
  align-items:center;
  justify-content:space-between;
}

/* 버튼 / 인풋 */
button {
  padding:6px 12px;
  border-radius:6px;
  border:1px solid #0b5fff;
  background:#eef4ff;
  color:#0b5fff;
  font-size:0.9rem;
  cursor:pointer;
  transition:background 0.15s, color 0.15s, border-color 0.15s;
}
button:hover {
  background:#0b5fff;
  color:#fff;
}
.btn-danger-outline {
  border-color:#dc2626;
  color:#dc2626;
  background:#fff5f5;
}
.btn-danger-outline:hover {
  background:#dc2626;
  color:#fff;
}
.form-control {
  width:100%;
  padding:6px 8px;
  border-radius:6px;
  border:1px solid #cbd5e1;
  font-size:0.9rem;
}

/* 기타 */
.action-bar {
  margin:8px 10px 10px;
  display:flex;
  justify-content:flex-end;
}
.inline-label {
  font-size:0.9rem;
  color:#475569;
  margin-bottom:4px;
}
.text-center { text-align:center; }
.text-right { text-align:right; }
.text-secondary { color:#64748b; }
.small { font-size:0.8rem; }
`;
