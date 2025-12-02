import React, { useEffect, useState } from "react";

export default function VisitDefinition(props) {
	console.log("### VisitDefinition props =", props);
    const namespace = props.namespace;
    const baseResourceURL = props.baseResourceURL;
    const groupId = props.groupId;
    const projectId =
        props.projectId
        ?? window.EDCPortletInfo?.portletParams?.projectId;

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

    // 체크 토글 함수
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

    const thStyle = {
    	    padding: "10px",
    	    textAlign: "center",
    	    borderBottom: "2px solid #ddd"
    	};

    	const tdLeftStyle = {
    	    padding: "10px",
    	    textAlign: "left"
    	};

    	const tdCenterStyle = {
    	    padding: "10px",
    	    textAlign: "center"
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
            const res = await fetch(url);
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
            const res = await fetch(url);
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
            return;
        }

        const selected = groupList.find(g => String(g.experimentalGroupId) === gid);
        setSelectedGroup(selected);
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
            const res = await fetch(url);
            setSubCRFList(await res.json());
        } catch (e) {
            console.error("subCRF 로드 실패", e);
        }
    };

    // --------------------------------------------------------------
    // 4) VisitDefinition - subCRF 매핑 로드
    // --------------------------------------------------------------
    const loadMapping = async () => {
        if (!visitDefinitions.length) return;

        let newMap = {};

        for (const v of visitDefinitions) {
            const url =
                `${baseResourceURL}&p_p_resource_id=/edc/getVisitSubCRFMapping` +
                `&${namespace}visitDefinitionId=${v.visitDefinitionId}`;

            try {
                const res = await fetch(url);
                const json = await res.json(); // ex: [10,12]
                newMap[v.visitDefinitionId] = json;
            } catch (e) {
                console.error("매핑 로드 실패", v.visitDefinitionId, e);
            }
        }

        setMapping(newMap);
    };

    // visitDefinition 로드 후 매핑도 추가
    useEffect(() => {
        if (visitDefinitions.length > 0) {
            loadMapping();
        }
    }, [visitDefinitions]);

    // --------------------------------------------------------------
    // 5) subCRF 체크박스 변경 핸들러
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
            items: Object.entries(mapping).map(([visitDefinitionId, subCRFIds]) => ({
                visitDefinitionId: Number(visitDefinitionId),
                subCRFIds
            }))
        };

        try {
            const res = await fetch(url, {
                method: "POST",
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
            prev.map(v => (v.visitDefinitionId === id ? { ...v, [key]: value } : v))
        );
    };

    const addVisitDefinition = async () => {
        if (!selectedGroup) return alert("그룹 먼저 선택");
        if (!newVisitName.trim()) return alert("방문명 입력");

        const form = new FormData();
        form.append(`${namespace}experimentalGroupId`, selectedGroup.experimentalGroupId);
        form.append(`${namespace}projectId`, projectId);
        form.append(`${namespace}name`, newVisitName);
        form.append(`${namespace}anchorType`, newAnchorType);
        form.append(`${namespace}offset`, newOffset);
        form.append(`${namespace}windowMinus`, newWindowMinus);
        form.append(`${namespace}windowPlus`, newWindowPlus);

        const url = `${baseResourceURL}&p_p_resource_id=/edc/addVisitDefinition`;

        const res = await fetch(url, { method: "POST", body: form });
        const json = await res.json();
        if (json.success) loadVisitDefinitions(selectedGroup.experimentalGroupId);
    };

    const deleteVisitDefinition = async (v) => {
        if (!window.confirm("삭제하시겠습니까?")) return;

        const form = new FormData();
        form.append(`${namespace}visitDefinitionId`, v.visitDefinitionId);

        const url = `${baseResourceURL}&p_p_resource_id=/edc/deleteVisitDefinition`;
        await fetch(url, { method: "POST", body: form });

        loadVisitDefinitions(selectedGroup.experimentalGroupId);
    };

    const saveVisitDefinitions = async () => {
        const url = `${baseResourceURL}&p_p_resource_id=/edc/updateVisitDefinitionBatch`;

        const payload = {
            items: visitDefinitions.map(v => ({
                visitDefinitionId: v.visitDefinitionId,
                name: v.name,
                anchorType: v.anchorType,
                offset: v.offset,
                windowMinus: v.windowMinus,
                windowPlus: v.windowPlus,
            }))
        };

        await fetch(url, {
            method: "POST",
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
    }, []);

    // =====================================================================
    // UI
    // =====================================================================
    return (
        <div style={{ padding: "20px" }}>

            {/* ------------------ 탭 ------------------ */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button
                    onClick={() => setActiveTab("visit")}
                    style={{
                        padding: "8px 16px",
                        background: activeTab === "visit" ? "#e7f1ff" : "#fff"
                    }}
                >
                    방문명 관리
                </button>

                <button
                    onClick={() => setActiveTab("subCRF")}
                    style={{
                        padding: "8px 16px",
                        background: activeTab === "subCRF" ? "#e7f1ff" : "#fff"
                    }}
                >
                    subCRF 관리
                </button>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
                {/* ------------------ 왼쪽: 그룹 선택 ------------------ */}
                <div style={{ width: "300px", border: "1px solid #ddd", padding: "16px" }}>
                    <h3>방문 그룹 선택</h3>

                    <select
                        style={{ width: "100%" }}
                        value={selectedGroup ? selectedGroup.experimentalGroupId : ""}
                        onChange={handleGroupChange}
                    >
                        <option value="">-- 그룹 선택 --</option>
                        {groupList.map(g => (
                            <option key={g.experimentalGroupId} value={g.experimentalGroupId}>
                                {g.expCode} — {g.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ------------------ 오른쪽: 본문 ------------------ */}
                <div style={{ flex: 1 }}>

                    {/* =============================================================== */}
                    {/* 방문명 관리 탭 (기존 그대로) */}
                    {/* =============================================================== */}
                    {activeTab === "visit" && (
                        <div>
                            <h2>Visit Definition 관리</h2>

                            {selectedGroup && visitDefinitions.length > 0 && (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                                            <tr key={v.visitDefinitionId}>
                                                <td>
                                                    <input
                                                        value={v.name}
                                                        onChange={e =>
                                                            updateField(v.visitDefinitionId, "name", e.target.value)
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <select
                                                        value={v.anchorType}
                                                        onChange={(e) =>
                                                            updateField(v.visitDefinitionId, "anchorType", e.target.value)
                                                        }
                                                    >
                                                        <option value="ConsentDate">ConsentDate</option>
                                                        {visitDefinitions
                                                            .filter(o => o.order < v.order)
                                                            .map(o => (
                                                                <option key={o.visitDefinitionId} value={o.name}>
                                                                    {o.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </td>

                                                <td>
                                                    <input
                                                        type="number"
                                                        value={v.offset}
                                                        onChange={(e) =>
                                                            updateField(v.visitDefinitionId, "offset", Number(e.target.value))
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <input
                                                        type="number"
                                                        value={v.windowMinus}
                                                        onChange={(e) =>
                                                            updateField(v.visitDefinitionId, "windowMinus", Number(e.target.value))
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <input
                                                        type="number"
                                                        value={v.windowPlus}
                                                        onChange={(e) =>
                                                            updateField(v.visitDefinitionId, "windowPlus", Number(e.target.value))
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <button onClick={() => deleteVisitDefinition(v)}>삭제</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {selectedGroup && (
                                <div style={{ marginTop: "20px" }}>
                                    <button onClick={saveVisitDefinitions}>전체 저장</button>
                                </div>
                            )}

                            {/* 추가 */}
                            {selectedGroup && (
                                <div style={{ marginTop: "30px" }}>
                                    <h3>방문명 추가</h3>

                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <input
                                            value={newVisitName}
                                            placeholder="방문명"
                                            onChange={(e) => setNewVisitName(e.target.value)}
                                        />

                                        <select
                                            value={newAnchorType}
                                            onChange={(e) => setNewAnchorType(e.target.value)}
                                        >
                                            <option value="ConsentDate">ConsentDate</option>
                                            {visitDefinitions.map(v => (
                                                <option key={v.visitDefinitionId} value={v.name}>
                                                    {v.name}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="number"
                                            value={newOffset}
                                            onChange={(e) => setNewOffset(Number(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            value={newWindowMinus}
                                            onChange={(e) => setNewWindowMinus(Number(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            value={newWindowPlus}
                                            onChange={(e) => setNewWindowPlus(Number(e.target.value))}
                                        />

                                        <button onClick={addVisitDefinition}>+ 추가</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* =============================================================== */}
                    {/* 🔥 subCRF 매핑 탭 완성 버전 */}
                    {/* =============================================================== */}
                    {activeTab === "subCRF" && (
                    	    <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
                    	        <h2>subCRF 관리</h2>

                    	        {!selectedGroup && (
                    	            <div style={{ color: "#777" }}>그룹을 먼저 선택하세요.</div>
                    	        )}

                    	        {selectedGroup && (
                    	            <table
                    	                style={{
                    	                    width: "100%",
                    	                    marginTop: "20px",
                    	                    borderCollapse: "collapse",
                    	                    fontSize: "14px"
                    	                }}
                    	            >
                    	                <thead>
                    	                    <tr style={{ background: "#f5f5f5" }}>
                    	                        <th style={thStyle}>방문 시점</th>
                    	                        <th style={thStyle}>subCRF1</th>
                    	                        <th style={thStyle}>subCRF2</th>
                    	                        <th style={thStyle}>subCRF3</th>
                    	                        <th style={thStyle}>subCRF4</th>
                    	                    </tr>
                    	                </thead>

                    	                <tbody>
                    	                    {visitDefinitions.map(v => (
                    	                        <tr key={v.visitDefinitionId} style={{ borderBottom: "1px solid #eee" }}>
                    	                            <td style={tdLeftStyle}>{v.name}</td>

                    	                            {/* subCRF 1~4 체크박스 */}
                    	                            {[1, 2, 3, 4].map(num => (
                    	                                <td style={tdCenterStyle} key={num}>
                    	                                    <input
                    	                                        type="checkbox"
                    	                                        checked={crfState[v.visitDefinitionId]?.includes(num) || false}
                    	                                        onChange={() => toggleCRF(v.visitDefinitionId, num)}
                    	                                    />
                    	                                </td>
                    	                            ))}
                    	                        </tr>
                    	                    ))}
                    	                </tbody>
                    	            </table>
                    	        )}
                    	    </div>
                    	)}


                </div>
            </div>
        </div>
    );
}
