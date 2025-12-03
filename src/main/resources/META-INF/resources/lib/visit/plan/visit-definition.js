import React, { useEffect, useState } from "react";

export default function VisitDefinition(props) {
    console.log("### VisitDefinition props =", props);
    const namespace = props.namespace;
    const baseResourceURL = props.baseResourceURL;
    const groupId = props.groupId;
    const projectId =
        props.projectId ??
        window.EDCPortletInfo?.portletParams?.projectId;

    const [groupList, setGroupList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [visitDefinitions, setVisitDefinitions] = useState([]);

    const [subCRFList, setSubCRFList] = useState([]);   // 🔥 subCRF 전체 목록
    const [mapping, setMapping] = useState({});        // 🔥 visitDefinitionId → [subCRFId...]

    const [newVisitName, setNewVisitName] = useState("");
    const [newOffset, setNewOffset] = useState(0);
    const [newWindowMinus, setNewWindowMinus] = useState(0);
    const [newWindowPlus, setNewWindowPlus] = useState(0);
    const [newAnchorType, setNewAnchorType] = useState("ConsentDate");

    const [activeTab, setActiveTab] = useState("visit");

    // subCRF 체크 상태 저장: { visitDefinitionId : [1,2,4] }
    const [crfState, setCrfState] = useState({});

    // 체크 토글 함수 (UI용)
    const toggleCRF = (visitDefinitionId, crfNumber) => {
        setCrfState(prev => {
            const list = prev[visitDefinitionId] || [];
            const exists = list.includes(crfNumber);

            return {
                ...prev,
                [visitDefinitionId]: exists
                    ? list.filter(n => n !== crfNumber)
                    : [...list, crfNumber]
            };
        });
    };

    // --------------------------------------------------------------
    // 1) 그룹 로드
    // --------------------------------------------------------------
    const loadGroups = async () => {
        const url =
            `${baseResourceURL}&p_p_resource_id=/edc/getGroups` +
            `&${namespace}groupId=${groupId}` +
            `&${namespace}projectId=${projectId}`;

        try {
            const res = await fetch(url, { credentials: "include" });
            setGroupList(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    // --------------------------------------------------------------
    // 2) Visit Definition 로드
    // --------------------------------------------------------------
    const loadVisitDefinitions = async (experimentalGroupId) => {
        const url =
            `${baseResourceURL}&p_p_resource_id=/edc/getVisitDefinitions` +
            `&${namespace}experimentalGroupId=${experimentalGroupId}`;

        try {
            const res = await fetch(url, { credentials: "include" });
            const list = await res.json();

            list.sort((a, b) => a.order - b.order);

            setVisitDefinitions(list);
        } catch (e) {
            console.error(e);
        }
    };

    const handleGroupChange = (e) => {
        const gid = e.target.value;
        if (!gid) {
            setSelectedGroup(null);
            setVisitDefinitions([]);
            setSubCRFList([]);
            setMapping({});
            setCrfState({});
            return;
        }

        const selected = groupList.find(
            g => String(g.experimentalGroupId) === gid
        );
        setSelectedGroup(selected || null);
        loadVisitDefinitions(gid);
        loadSubCRFs();
    };

    // --------------------------------------------------------------
    // 3) subCRF 전체 목록 로드
    // --------------------------------------------------------------
    const loadSubCRFs = async () => {
        const url = `${baseResourceURL}&p_p_resource_id=/edc/getSubCRFList` +
            `&${namespace}projectId=${projectId}`;

        try {
            const res = await fetch(url, { credentials: "include" });
            setSubCRFList(await res.json());
        } catch (e) {
            console.error("subCRF 로드 실패", e);
        }
    };

    // --------------------------------------------------------------
    // 4) VisitDefinition - subCRF 매핑 로드
    // --------------------------------------------------------------
    const loadMapping = async () => {
        if (!visitDefinitions.length) {
            setMapping({});
            setCrfState({});
            return;
        }

        let newMap = {};

        for (const v of visitDefinitions) {
            const url =
                `${baseResourceURL}&p_p_resource_id=/edc/getVisitSubCRFMapping` +
                `&${namespace}visitDefinitionId=${v.visitDefinitionId}`;

            try {
                const res = await fetch(url, { credentials: "include" });
                const json = await res.json(); // ex: [10,12]
                newMap[v.visitDefinitionId] = json;
            } catch (e) {
                console.error("매핑 로드 실패", v.visitDefinitionId, e);
            }
        }

        setMapping(newMap);

        // (옵션) UI 체크박스 상태도 매핑과 동기화하고 싶으면 여기서 crfState 구성
        // 예: visitDefinitionId 당 1~4 번 subCRF 사용 여부를 표시하는 용도라면
        // 필요시 로직 추가
    };

    // visitDefinition 로드 후 매핑도 추가
    useEffect(() => {
        if (visitDefinitions.length > 0) {
            loadMapping();
        } else {
            setMapping({});
            setCrfState({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitDefinitions]);

    // --------------------------------------------------------------
    // 5) subCRF 체크박스 변경 핸들러 (mapping용 – 필요 시 사용)
    // --------------------------------------------------------------
    const toggleSubCRF = (visitDefinitionId, subCRFId) => {
        setMapping(prev => {
            const list = prev[visitDefinitionId] ?? [];

            let updated;
            if (list.includes(subCRFId)) {
                updated = list.filter(id => id !== subCRFId);
            } else {
                updated = [...list, subCRFId];
            }

            return { ...prev, [visitDefinitionId]: updated };
        });
    };

    // --------------------------------------------------------------
    // 6) 전체 저장 (VisitDefinition & SubCRF 매핑)
    // --------------------------------------------------------------
    const saveAll = async () => {
        if (!selectedGroup) return alert("그룹 먼저 선택");

        const url = `${baseResourceURL}&p_p_resource_id=/edc/saveVisitSubCRFMappingBatch`;

        const payload = {
            items: Object.entries(mapping).map(
                ([visitDefinitionId, subCRFIds]) => ({
                    visitDefinitionId: Number(visitDefinitionId),
                    subCRFIds
                })
            )
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) alert("저장되었습니다.");
            else alert("저장 실패");
        } catch (e) {
            console.error(e);
            alert("오류 발생");
        }
    };

    // --------------------------------------------------------------
    // 방문명 기본 기능들(추가/삭제/수정/일괄저장) 그대로 유지
    // --------------------------------------------------------------
    const updateField = (id, key, value) => {
        setVisitDefinitions(prev =>
            prev.map(v =>
                v.visitDefinitionId === id ? { ...v, [key]: value } : v
            )
        );
    };

    const addVisitDefinition = async () => {
        if (!selectedGroup) return alert("그룹 먼저 선택");
        if (!newVisitName.trim()) return alert("방문명 입력");

        const form = new FormData();
        form.append(
            `${namespace}experimentalGroupId`,
            selectedGroup.experimentalGroupId
        );
        form.append(`${namespace}projectId`, projectId);
        form.append(`${namespace}name`, newVisitName);
        form.append(`${namespace}anchorType`, newAnchorType);
        form.append(`${namespace}offset`, newOffset);
        form.append(`${namespace}windowMinus`, newWindowMinus);
        form.append(`${namespace}windowPlus`, newWindowPlus);

        const url = `${baseResourceURL}&p_p_resource_id=/edc/addVisitDefinition`;

        const res = await fetch(url, { method: "POST", body: form, credentials:"include" });
        const json = await res.json();
        if (json.success) {
            setNewVisitName("");
            setNewOffset(0);
            setNewWindowMinus(0);
            setNewWindowPlus(0);
            setNewAnchorType("ConsentDate");
            loadVisitDefinitions(selectedGroup.experimentalGroupId);
        }
    };

    const deleteVisitDefinition = async (v) => {
        if (!window.confirm("삭제하시겠습니까?")) return;

        const form = new FormData();
        form.append(`${namespace}visitDefinitionId`, v.visitDefinitionId);

        const url =
            `${baseResourceURL}&p_p_resource_id=/edc/deleteVisitDefinition`;
        await fetch(url, { method: "POST", body: form, credentials:"include" });

        loadVisitDefinitions(selectedGroup.experimentalGroupId);
    };

    const saveVisitDefinitions = async () => {
        const url =
            `${baseResourceURL}&p_p_resource_id=/edc/updateVisitDefinitionBatch`;

        const payload = {
            items: visitDefinitions.map(v => ({
                visitDefinitionId: v.visitDefinitionId,
                name: v.name,
                anchorType: v.anchorType,
                offset: v.offset,
                windowMinus: v.windowMinus,
                windowPlus: v.windowPlus
            }))
        };

        await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("방문명 저장 완료");
    };

    // --------------------------------------------------------------
    // 처음 실행
    // --------------------------------------------------------------
    useEffect(() => {
        loadGroups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =====================================================================
    // UI
    // =====================================================================
    return (
        <>
            <style>{css}</style>

            <div className="layout">
                {/* ------------------ 왼쪽: 그룹 선택 ------------------ */}
                <aside className="left">
                    <div className="left-title">■ 방문 그룹</div>

                    <div className="mb-2">
                        <div className="inline-label">그룹 선택</div>
                        <select
                            className="form-control"
                            value={
                                selectedGroup
                                    ? selectedGroup.experimentalGroupId
                                    : ""
                            }
                            onChange={handleGroupChange}
                        >
                            <option value="">-- 그룹 선택 --</option>
                            {groupList.map(g => (
                                <option
                                    key={g.experimentalGroupId}
                                    value={g.experimentalGroupId}
                                >
                                    {g.expCode} — {g.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="count-bar">
                        <div>
                            총 그룹 수:{" "}
                            <b>{groupList.length}</b>
                        </div>
                        {selectedGroup && (
                            <div className="text-secondary small">
                                선택된 그룹: {selectedGroup.name}
                            </div>
                        )}
                    </div>

                    <div className="left-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>코드</th>
                                    <th>그룹명</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupList.map(g => {
                                    const active =
                                        selectedGroup &&
                                        selectedGroup.experimentalGroupId ===
                                            g.experimentalGroupId;
                                    return (
                                        <tr
                                            key={g.experimentalGroupId}
                                            className={
                                                active ? "row-active" : ""
                                            }
                                            onClick={() =>
                                                handleGroupChange({
                                                    target: {
                                                        value: g.experimentalGroupId
                                                    }
                                                })
                                            }
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>{g.expCode}</td>
                                            <td>{g.name}</td>
                                        </tr>
                                    );
                                })}
                                {groupList.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={2}
                                            className="text-center text-secondary"
                                        >
                                            조회된 그룹이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </aside>

                {/* ------------------ 오른쪽: 탭 & 내용 ------------------ */}
                <section className="right">
                    {/* 선택된 그룹 정보 바 */}
                    <div className="info">
                        <div className="info-row info-row-3">
                            <div className="label">그룹 코드</div>
                            <div className="value">
                                {selectedGroup?.expCode || "-"}
                            </div>
                            <div className="label">그룹명</div>
                            <div className="value">
                                {selectedGroup?.name || "-"}
                            </div>
                            <div className="label">방문 개수</div>
                            <div className="value">
                                {visitDefinitions.length}
                            </div>
                        </div>
                    </div>

                    {/* 탭 헤더 */}
                    <div className="tab-header">
                        <button
                            type="button"
                            className={
                                "tab-btn" +
                                (activeTab === "visit" ? " active" : "")
                            }
                            onClick={() => setActiveTab("visit")}
                        >
                            방문명 관리
                        </button>

                        <button
                            type="button"
                            className={
                                "tab-btn" +
                                (activeTab === "subCRF" ? " active" : "")
                            }
                            onClick={() => setActiveTab("subCRF")}
                        >
                            subCRF 관리
                        </button>
                    </div>

                    {/* ------------------ 방문명 관리 탭 ------------------ */}
                    {activeTab === "visit" && (
                        <div className="tab-body">
                            <h2 className="tab-title">Visit Definition 관리</h2>

                            {!selectedGroup && (
                                <div className="empty-hint">
                                    왼쪽에서 방문 그룹을 먼저 선택해 주세요.
                                </div>
                            )}

                            {selectedGroup && (
                                <>
                                    <div className="schedule-wrap">
                                        <table className="basic-table">
                                            <thead>
                                                <tr>
                                                    <th>이름</th>
                                                    <th>Anchor</th>
                                                    <th>Offset</th>
                                                    <th>Window -</th>
                                                    <th>Window +</th>
                                                    <th>삭제</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visitDefinitions.map(v => (
                                                    <tr
                                                        key={
                                                            v.visitDefinitionId
                                                        }
                                                    >
                                                        <td>
                                                            <input
                                                                className="form-control"
                                                                value={v.name}
                                                                onChange={e =>
                                                                    updateField(
                                                                        v.visitDefinitionId,
                                                                        "name",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <select
                                                                className="form-control"
                                                                value={
                                                                    v.anchorType
                                                                }
                                                                onChange={e =>
                                                                    updateField(
                                                                        v.visitDefinitionId,
                                                                        "anchorType",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            >
                                                                <option value="ConsentDate">
                                                                    ConsentDate
                                                                </option>
                                                                {visitDefinitions
                                                                    .filter(
                                                                        o =>
                                                                            o.order <
                                                                            v.order
                                                                    )
                                                                    .map(o => (
                                                                        <option
                                                                            key={
                                                                                o.visitDefinitionId
                                                                            }
                                                                            value={
                                                                                o.name
                                                                            }
                                                                        >
                                                                            {
                                                                                o.name
                                                                            }
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </td>

                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={
                                                                    v.offset
                                                                }
                                                                onChange={e =>
                                                                    updateField(
                                                                        v.visitDefinitionId,
                                                                        "offset",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={
                                                                    v.windowMinus
                                                                }
                                                                onChange={e =>
                                                                    updateField(
                                                                        v.visitDefinitionId,
                                                                        "windowMinus",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={
                                                                    v.windowPlus
                                                                }
                                                                onChange={e =>
                                                                    updateField(
                                                                        v.visitDefinitionId,
                                                                        "windowPlus",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn-danger-outline"
                                                                onClick={() =>
                                                                    deleteVisitDefinition(
                                                                        v
                                                                    )
                                                                }
                                                            >
                                                                삭제
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {visitDefinitions.length ===
                                                    0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={6}
                                                            className="text-center text-secondary"
                                                        >
                                                            등록된 방문 정의가
                                                            없습니다.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="action-bar">
                                        <button
                                            type="button"
                                            onClick={saveVisitDefinitions}
                                        >
                                            방문명 저장
                                        </button>
                                    </div>

                                    {/* 방문명 추가 */}
                                    <div className="card card-add">
                                        <h3>방문명 추가</h3>

                                        <div className="add-row">
                                            <input
                                                className="form-control"
                                                value={newVisitName}
                                                placeholder="방문명"
                                                onChange={e =>
                                                    setNewVisitName(
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            <select
                                                className="form-control"
                                                value={newAnchorType}
                                                onChange={e =>
                                                    setNewAnchorType(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="ConsentDate">
                                                    ConsentDate
                                                </option>
                                                {visitDefinitions.map(v => (
                                                    <option
                                                        key={
                                                            v.visitDefinitionId
                                                        }
                                                        value={v.name}
                                                    >
                                                        {v.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                className="form-control"
                                                value={newOffset}
                                                onChange={e =>
                                                    setNewOffset(
                                                        Number(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                placeholder="Offset"
                                            />
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={newWindowMinus}
                                                onChange={e =>
                                                    setNewWindowMinus(
                                                        Number(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                placeholder="Window -"
                                            />
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={newWindowPlus}
                                                onChange={e =>
                                                    setNewWindowPlus(
                                                        Number(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                placeholder="Window +"
                                            />

                                            <button
                                                type="button"
                                                onClick={addVisitDefinition}
                                            >
                                                + 추가
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ------------------ subCRF 매핑 탭 ------------------ */}
                    {activeTab === "subCRF" && (
                        <div className="tab-body">
                            <h2 className="tab-title">subCRF 관리</h2>

                            {!selectedGroup && (
                                <div className="empty-hint">
                                    왼쪽에서 방문 그룹을 먼저 선택해 주세요.
                                </div>
                            )}

                            {selectedGroup && (
                                <>
                                    <div className="schedule-wrap">
                                        <table className="basic-table">
                                            <thead>
                                                <tr>
                                                    <th className="sticky-col">
                                                        방문 시점
                                                    </th>
                                                    <th>subCRF1</th>
                                                    <th>subCRF2</th>
                                                    <th>subCRF3</th>
                                                    <th>subCRF4</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {visitDefinitions.map(v => (
                                                    <tr
                                                        key={
                                                            v.visitDefinitionId
                                                        }
                                                    >
                                                        <td className="sticky-col">
                                                            {v.name}
                                                        </td>

                                                        {[1, 2, 3, 4].map(
                                                            num => (
                                                                <td
                                                                    key={num}
                                                                    className="text-center"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            crfState[
                                                                                v
                                                                                    .visitDefinitionId
                                                                            ]?.includes(
                                                                                num
                                                                            ) ||
                                                                            false
                                                                        }
                                                                        onChange={() =>
                                                                            toggleCRF(
                                                                                v.visitDefinitionId,
                                                                                num
                                                                            )
                                                                        }
                                                                    />
                                                                </td>
                                                            )
                                                        )}
                                                    </tr>
                                                ))}

                                                {visitDefinitions.length ===
                                                    0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="text-center text-secondary"
                                                        >
                                                            방문 정의가
                                                            없습니다.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="action-bar">
                                        <button
                                            type="button"
                                            onClick={saveAll}
                                        >
                                            subCRF 매핑 저장
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

// AddVisit UI와 최대한 맞춘 스타일
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
  grid-template-columns:90px 1fr 90px 1fr 90px 1fr;
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

/* 탭 헤더 */
.tab-header {
  display:flex;
  gap:4px;
  padding:6px 10px 0;
  border-bottom:1px solid #e5e7eb;
}
.tab-btn {
  padding:8px 14px;
  border:none;
  background:transparent;
  border-bottom:2px solid transparent;
  cursor:pointer;
  font-size:0.95rem;
  color:#64748b;
}
.tab-btn.active {
  border-bottom-color:#0b5fff;
  color:#0b5fff;
  font-weight:600;
}

/* 탭 내용 공통 */
.tab-body {
  padding:10px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.tab-title {
  font-size:1rem;
  font-weight:600;
  margin:0 0 4px;
}
.empty-hint {
  padding:16px;
  border-radius:6px;
  background:#f8fafc;
  color:#475569;
  font-size:0.9rem;
}

/* 테이블 공통 */
.schedule-wrap {
  background:#fff;
  border-top:1px solid #e5e7eb;
  max-height:420px;
  overflow-y:auto;
  overflow-x:auto;
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
.sticky-col {
  position:sticky;
  left:0;
  z-index:1;
  background:#f1f5f9;
  min-width:120px;
  font-weight:600;
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

/* 추가 영역 */
.action-bar {
  margin-top:8px;
  display:flex;
  justify-content:flex-end;
}
.card {
  border:1px solid #e5e7eb;
  border-radius:8px;
  padding:10px;
  background:#f9fafb;
}
.card-add h3 {
  margin:0 0 8px;
  font-size:0.95rem;
}
.add-row {
  display:grid;
  grid-template-columns:2fr 2fr 1fr 1fr 1fr auto;
  gap:6px;
}
.inline-label {
  font-size:0.9rem;
  color:#475569;
  margin-bottom:4px;
}
.text-center { text-align:center; }
.text-secondary { color:#64748b; }
.text-muted { color:#9ca3af; }
.text-danger { color:#dc2626; }
.small { font-size:0.8rem; }
`;
