import React, { Component, createRef } from "react";

import "@clayui/css/lib/css/atlas.css";
//import "../../css/VisitEvent.css";
import Form, {ClayInput, ClaySelect} from "@clayui/form";
import Button from "@clayui/button";
import Modal, {useModal} from "@clayui/modal";
import {Provider} from "@clayui/core";
import ClayTable from "@clayui/table";
import { SXPortlet, Workbench } from "../../../crf/workbench";
import { Event, PortletKeys } from "../../../crf/station-x"; 

//Modal Controller Wrapper
function ControlledModal({open, title, size="sm", spritemap, className, onClose, body, footer}) {
    const {observer} = useModal({onClose});
    if (!open) return null;
    return (
      <Modal className={className} observer={observer} size={size} spritemap={spritemap}>
        <Modal.Header>{title}</Modal.Header>
        <Modal.Body>{body}</Modal.Body>
        <Modal.Footer last={footer}/>
      </Modal>
    );
  }

//Set ResourceURL
function getPortletCtx() {
    const ctx = window.EDCPortletInfo?.portletParams || {};
    const ns = ctx.namespace || "";
    const resURL = ctx.addVisitURL
      || (ctx.baseResourceURL + "&p_p_resource_id=%2Fedc%2FaddVisit");
    return {ns, resURL};
}

//URL Builder
function buildURL(action, params = {}) {
    const {ns, resURL} = getPortletCtx();
    const url = new URL(resURL, window.location.origin);
    url.searchParams.set(`${ns}op`, action);
    url.searchParams.set(`op`, action);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v != null) url.searchParams.set(`${ns}${k}`, String(v));
      url.searchParams.set(k, String(v));
    }
    return url.toString();
}

//GET function
async function apiGET(action, params) {
    const url = buildURL(action, params);
    const res = await fetch(url, {credentials: "include"});
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return JSON.parse(raw); } catch { throw new Error("Not JSON → " + raw.slice(0, 200)); }
}

//Post function
async function apiPOST(action, params) {
    const {ns, resURL} = getPortletCtx();
    const body = new URLSearchParams();
    body.set(`${ns}op`, action); body.set("op", action);
    for (const [k, v] of Object.entries(params || {})) {
      if (v == null) continue;
      body.set(`${ns}${k}`, String(v));
      body.set(k, String(v));
    }
    const res = await fetch(resURL, {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
      body: body.toString()
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return JSON.parse(raw); } catch { throw new Error("Not JSON : " + raw.slice(0, 200)); }
}

//load items to Array function
function asItems(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    // Java에서 JSONArray를 바로 반환하므로 Array.isArray 체크가 먼저 수행됨
    return data.items || [];
}

//calculate Window range
function checkWindowStatus(eventDateStr, planDateStr, winMinus, winPlus) {
    if (!eventDateStr || !planDateStr) return "-";

    const eventDate = new Date(eventDateStr);
    const planDate = new Date(planDateStr);

    // 시간대 차이로 인한 오차 제거를 위해 자정으로 설정
    eventDate.setHours(0, 0, 0, 0);
    planDate.setHours(0, 0, 0, 0);

    // 일수 차이 계산 (밀리초 -> 일)
    const diffTime = eventDate - planDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // windowMinus 처리: 보통 양수(예: 3일)로 입력되지만, 계산시에는 기준일 이전이므로 음수(-3)로 처리
    // 만약 DB에 이미 음수로 저장되어 있다면 Math.abs를 사용하여 절대값 처리 후 음수로 변환
    const lowerBound = -Math.abs(winMinus || 0); 
    const upperBound = Math.abs(winPlus || 0);

    if (diffDays < lowerBound) {
        return <span className="text-danger" style={{fontWeight:'bold'}}>너무 빠릅니다 ({diffDays}일)</span>;
    }
    if (diffDays > upperBound) {
        return <span className="text-danger" style={{fontWeight:'bold'}}>너무 늦습니다 (+{diffDays}일)</span>;
    }

    return <span className="text-success">정상</span>;
}

export default class AddVisit extends Component {
    constructor(props) {
        super(props);

        this.state = {
            //state var
            subjectsLoading: false,
            subjectsError: null,
            institutionLoading: false,
            institutionError: null,
            experimentalGroupLoading: false,
            experimentalGroupError: null,
            visitsLoading: false,
            visitsError: null,
            subjectVisitDefinitionLoading: false,
            subjectVisitDefinitionError: null,
            queryLinkLoading: false,
            queryLinkError: null,
            queryLinkInfoLoading: false,
            queryLinkInfoError: null,

            // CRF Loading
            crfLoading: false,
            crfError: null,
            targetDef: null,

            //List Data
            subjects: [],
            visits: [],
            experimentalGroups: [],
            institutions: [],
            subjectVisitDefinitions: [],
            queryLinks: [],
            queryLinkInfos: {},

            //filtering & select
            field: "serialId",
            selectedSubjectId: null,
            q: "",

            //modal state
            visitDateModalOpen: false,
            visitDateMode: "new", // "new" | "edit"
            visitDateForm: { visitName: "", date: "", visitDefinitionId: 0 },
            targetSubjectId: null,
            crfModalOpen: false,
            portletModal: false


        }

        this.portletRef = createRef(null);
        this.workingPortletInstance = null;
        this.namespace = props.namespace;
        this.addVisitId = props.workbench.portletId;
        this.baseRenderURL = props.baseRenderURL;
        this.baseResourceURL = props.baseResourceURL;
        this.spritemapPath = props.spritemapPath;
        this.userId = props.userId;
        this.userInstitutionName = props.userInstitutionName;
        this.userInstitutionCode = props.userInstitutionCode;
        this.addVisitURL = props.addVisitURL;

        //initialize workbench
        this.workbench = new Workbench({
        	namespace: this.namespace,
        	workbenchId: this.addVisitId,
        	baseRenderURL: this.baseRenderURL,
        	baseResourceURL: this.baseResourceURL,
        	spritemap: this.spritemapPath
      	});
        console.log('props: ', props);
    }
    _mounted = false;

    /* Component Mount, Unmount, Update */

    async componentDidMount() {
        this._mounted = true;

        Event.on(Event.SX_HANDSHAKE, this.listenerHandshake);
        Event.on(Event.SX_REQUEST, this.listenerRequest);

        // 초기 로딩: 기관에 속한 대상자 리스트 로드
        if (this.userInstitutionCode) {
            this.loadSubjects(this.userInstitutionCode);
        }
    }

    componentWillUnmount() {
        Event.off(Event.SX_HANDSHAKE, this.listenerHandshake);
        Event.off(Event.SX_REQUEST, this.listenerRequest);
        this._mounted = false;
      }

    async componentDidUpdate(prevProps, prevState)
    {
        const { selectedSubjectId, subjects } = this.state;
        if (prevState.selectedSubjectId !== selectedSubjectId) {
            if (!selectedSubjectId) {
                this.setState({ visits: [], institutions: [], SubjectVisitDefinitons: [], experimentalGroups: [] });
                return;
            }
            //find selectedSubject
            const targetSubject = subjects.find(s => s.subjectId === selectedSubjectId);
            if (targetSubject) {
                const targetInstitutionId = targetSubject.institutionId;
                const experimentalGroupId = targetSubject.expGroupId;

                const promises = [
                    this.loadSubjectVisitDefinitons(selectedSubjectId),
                    this.loadVisits(selectedSubjectId),
                    //load by selectedSubject's InstitutionId
                    targetInstitutionId ? this.loadInstitution(targetInstitutionId) : Promise.resolve(),
                    //load by selectedSubject's ExperimentalGroupId
                    experimentalGroupId ? this.loadExperimentalGroup(experimentalGroupId) : Promise.resolve()
                ];
                await Promise.all(promises);
            }
        }
    }

    /* Listener Methods */

    listenerHandshake = (event) => {
        const dataPacket = event.dataPacket;
        if (dataPacket.targetPortlet !== this.namespace) {
            return;
        }

        //console.log("Workbench HANDSHAKE received: ", dataPacket);

        Event.fire(Event.SX_WORKBENCH_READY, this.namespace, dataPacket.sourcePortlet, {});
    };

    listenerRequest = async (event) => {
        const dataPacket = event.dataPacket;

        if (dataPacket.targetPortlet !== this.namespace) {
            return;
        }

        //console.log("SX_REQUEST received: ", dataPacket);
        this.workbench.processRequest({
            params: dataPacket.params,
            requestPortlet: dataPacket.sourcePortlet,
            requestId: dataPacket.requestId
        });
    };

    /** Subject List Load
    *    @param {BIGINT} userId in ResourceCommand, Filtered by user's institution.
    */
    loadSubjects = async (userId) => {
        if (!this._mounted) return;
        try {
            this.setState({ subjectsLoading: true, subjectsError: null });
            const items = asItems(await apiGET("subjects", { parameter: userId }));
            const rows = items.map(s => ({
                //Subject Data
                subjectId: Number(s.subjectId),
                serialId: s.serialId ?? "",
                name: s.name ?? "",
                randNo: s.randNo ?? "",
                institutionId: Number(s.institutionId),
                subjectStatus: s.subjectStatus ?? "",
                subjectStatusApplyDate: s.subjectStatusApplyDate ?? "",
                consentAgreeDate: s.consentAgreeDate ?? "",
                expGroupId: Number(s.expGroupId),
                applyDate: s.applyDate ?? ""

            }));
            if (this._mounted) this.setState({ subjects: rows }); 
        }
        catch (e) {
            if (this._mounted) this.setState({ subjectsError: String(e) });
        } finally {
            if (this._mounted) this.setState({ subjectsLoading: false });
        }
    };

    /**
     * Subject's Institution Load
     * @param {BIGINT} institutionId in ResourceCommand, Get By Institution
     * @returns 
     */
    loadInstitution = async (institutionId) => {
        if(!this._mounted) return;
        try {
            this.setState({ institutionLoading: true, institutionError: null });
            const data = await apiGET("institution", {parameter: institutionId});
            const rows = [{
                //Institution Data
                institutionId: Number(data.institutionId),
                companyId: Number(data.companyId),
                groupId: Number(data.groupId),
                projectId: Number(data.projectId),
                userId: Number(data.userId),
                userName: data.userName ?? "",
                createDate: data.createDate ?? "",
                modifiedDate: data.modifiedDate ?? "",
                status: Number(data.status),
                statusByUserId: Number(data.statusByUserId),
                statusByUserName: data.statusByUserName ?? "",
                statusDate: data.statusDate ?? "",
                code: data.code ?? "",
                name: data.name ?? "",
                enName: data.enName ?? "",
                type: Number(data.type),
                piName: data.piName ?? "",
                contactNum: data.contactNum ?? "",
                email: data.email ?? "",
                irbDate: data.irbDate ?? ""
            }];
            if (this._mounted) this.setState({ institutions: rows});
        } catch (e) {
            if (this._mounted) this.setState({ institutionError: String(e) });
        } finally {
            if (this._mounted) this.setState({ institutionLoading: false });
        }
    };

    /**
     * Experimental Group Load
     * @param {BIGINT} experimentalGroupId in ResourceCommand, Find By experimentalGroupId
     */
    loadExperimentalGroup = async (experimentalGroupId) => {
        if(!this._mounted) return;
        try {
            this.setState({ experimentalGroupLoading: true, experimentalGroupError: null });
            const data = asItems(await apiGET("experimentalGroup", {parameter: experimentalGroupId}));
            const rows = [{
                //Experimental Group Data
                experimentalGroupId: Number(data.experimentalGroupId),
                companyId: Number(data.companyId),
                groupId: Number(data.groupId),
                projectId: Number(data.projectId),
                userId: Number(data.userId),
                userName: data.userName ?? "",
                createDate: data.createDate ?? "",
                modifiedDate: data.modifiedDate ?? "",
                status: Number(data.status),
                statusByUserId: Number(data.statusByUserId),
                statusByUserName: data.statusByUserName ?? "",
                expCode: data.expCode ?? "",
                name: data.name ?? "",
                description: data.description ?? "",
                type: Number(data.type)
            }];
            if (this._mounted) this.setState({ experimentalGroups: rows});
        }catch(e) {
            if (this._mounted) this.setState({ experimentalGroupError: String(e) });
        } finally {
            if (this._mounted) this.setState({ experimentalGroupLoading: false });
        }
    };

    /** Visit List Load
    *  @param {BIGINT} subjectId in ResourceCommand, Filetered by subjectId.
    */
    loadVisits = async (subjectId) => {
        if(!this._mounted) return;
        try {
            this.setState({ visitsLoading: true, visitsError: null });
            const items = asItems(await apiGET("visits", {parameter: subjectId }));
            const rows = items.map(v => ({
                //VisitEvent Data
                visitEventId: Number(v.visitEventId),
                companyId: Number(v.companyId),
                groupId: Number(v.groupId),
                projectId: Number(v.projectId),
                institutionId: Number(v.institutionId),
                subjectId: Number(v.subjectId),
                visitDefinitionId: Number(v.visitDefinitionId),
                userId: Number(v.userId),
                userName: v.userName ?? "",
                createDate: v.createDate ?? "",
                modifiedDate: v.modifiedDate ?? "",
                status: Number(v.status),
                statusByUserId: Number(v.statusByUserId),
                statusByUserName: v.statusByUserName ?? "",
                statusDate: v.statusDate ?? "",
                anchorType: v.anchorType ?? "",
                anchorDate: v.anchorDate ?? "",
                offset: Number(v.offset),
                planDate: v.planDate ?? "",
                eventDate: v.eventDate ?? "",
                deviationStatus: v.deviationStatus ?? "",
                instanceLinkObj: v.instanceLinkObj ?? ""
            }));
            if (this._mounted) {
                this.setState({ visits: rows }, () => {
                    rows.forEach(row => {
                        if (row.instanceLinkObj) {
                            this.loadQueryLinkInfo(row.instanceLinkObj, row.visitDefinitionId);
                        }
                    });
                });
            }
        } catch (e) {
            if (this._mounted) this.setState({ visitsError: String(e) });
        } finally {
            if (this._mounted) this.setState({ visitsLoading: false });
        }
    };

    /**
     * Visit's SubjectVisitDefinition Load
     * @param {BIGINT} subjectId in ResourceCommand, Filetered by subjectId.
     * @returns 
     */
    loadSubjectVisitDefinitons = async (subjectId) => {
        if(!this._mounted) return;
        try {
            this.setState({ subjectVisitDefinitionLoading: true, subjectVisitDefinitionError: null });
            const items = asItems(await apiGET("subjectVisitDefinitions", { parameter: subjectId }));
            const rows = items.map(svd => ({
                //SubjectVisitDefinition Data
                subjectVisitDefinitionId: Number(svd.subjectVisitDefinitionId),
                companyId: Number(svd.companyId),
                groupId: Number(svd.groupId),
                projectId: Number(svd.projectId),
                visitGroupId: Number(svd.visitGroupId),
                subjectId: Number(svd.subjectId),
                userId: Number(svd.userId),
                userName: svd.userName ?? "",
                createDate: svd.createDate ?? "",
                modifiedDate: svd.modifiedDate ?? "",
                status: Number(svd.status),
                statusByUserId: Number(svd.statusByUserId),
                statusByUserName: svd.statusByUserName ?? "",
                statusDate: svd.statusDate ?? "",
                parentCode: svd.parentCode ?? "",
                visitDefinitionCode: svd.visitDefinitionCode ?? "",
                name: svd.name ?? "",
                order: svd.order ?? "",
                extCode: svd.extCode ?? "",
                anchorType: svd.anchorType ?? "",
                offset: Number(svd.offset),
                windowMinus: Number(svd.windowMinus),
                windowPlus: Number(svd.windowPlus),
                type: Number(svd.type),
                repeatCount: Number(svd.repeatCount),
                visitCRFId: Number(svd.visitCRFId)
            }));
            if (this._mounted) this.setState({ subjectVisitDefinitions: rows});
        } catch (e) {
            if (this._mounted) this.setState({ subjectVisitDefinitionError: String(e) });
        } finally {
            if (this._mounted) this.setState({ subjectVisitDefinitionLoading: false });
        }
    };

    /**
     * Get Querys By instanceId
     * @param {BIGINT} instanceId in ResourceCommand, Filtered By instanceId.
     * @returns 
     */
    loadQueryLinksByinstanceId = async (instanceId) => {
        if(!this._mounted) return;
        try {
            this.setState({ queryLinkLoading: true, queryLinkError: null});
            const items = asItems(await apiGET("queryLinks", { parameter: instanceId }));
            const rows = items.map(ql => ({
                //queryLink Data
                queryId: Number(ql.queryId),
                companyId: Number(ql.companyId),
                groupId: Number(ql.groupId),
                projectId: Number(ql.projectId),
                userId: Number(ql.userId),
                userName: ql.userName ?? "",
                createDate: ql.createDate ?? "",
                modifiedDate: ql.modifiedDate ?? "",
                subjectId: Number(ql.subjectId),
                visitGroupId: Number(ql.visitGroupId),
                visitDefinitionId: Number(ql.visitDefinitionId),
                visitCRFId: Number(ql.visitCRFId),
                subCRFId: Number(ql.subCRFId),
                instanceId: Number(ql.instanceId),
                itemCode: Number(ql.itemCode),
                sourceType: ql.sourceType ?? "",
                ruleId: Number(ql.ruleId),
                ruleInfo: ql.ruleInfo ?? ""
            }));
            if (this._mounted) this.setState({ queryLinks: rows});
        } catch (e) {
            if (this._mounted) this.setState({ queryLinkError: String(e) });
        } finally {
            if (this._mounted) this.setState({ queryLinkLoading: false });
        }
    };

    loadQueryLinkInfo = async (instanceLinkObj, visitDefinitionId) => {
        if (!this._mounted) return;
        try {
            this.setState({ queryLinkInfoLoading: true, queryLinkInfoError: null });
    
            // 1) asItems 제거, 응답을 그대로 받기
            const data = await apiGET("queryLinkInfo", { parameter: instanceLinkObj });
    
            // 디버깅용 로그 (원하면 유지)
            console.log("queryLinkInfo response for visitDefinitionId", visitDefinitionId, ":", data);
    
            // 2) 응답 객체에서 바로 값 꺼내기
            const info = {
                hasQuery: Boolean(data.hasQuery),
                queryCount: Number(data.queryCount)
            };
    
            // 3) state에 저장
            this.setState(prev => ({
                queryLinkInfos: {
                    ...prev.queryLinkInfos,
                    [visitDefinitionId]: info
                }
            }));
        } catch (e) {
            if (this._mounted) this.setState({ queryLinkInfoError: String(e) });
        } finally {
            if (this._mounted) this.setState({ queryLinkInfoLoading: false });
        }
    };

    //Parse Subject Utils
    get selectedSubject() {
        const { subjects, selectedSubjectId } = this.state;
        return subjects.find(s => s.subjectId === selectedSubjectId) || null;
    }

    get filteredSubjects() {
        const { subjects, field, q } = this.state;
        return subjects.filter(p => {
            const textVal = (p[field] || "").toLowerCase();
            const byText  = !q || textVal.includes(q.toLowerCase());
            return byText;
        });
    }

    //Event Handlers
    //When you clicked subject
    handleRowClick = (subjectId) => this.setState({ selectedSubjectId: subjectId });

    openDateModal = (visitDef, currentEventDate) => {
        const sel = this.selectedSubject; // getter 활용
        if (!sel) return;
    
        this.setState({
            targetDef: visitDef, // [핵심] 현재 선택한 정의 객체 저장 (여기서 visitCRFId를 나중에 읽음)
            visitDateMode: currentEventDate ? "edit" : "new",
            visitDateForm: { 
                visitName: visitDef.name, 
                visitDefinitionId: visitDef.subjectVisitDefinitionId,
                date: currentEventDate || "" 
            },
            targetSubjectId: sel.subjectId,
            visitDateModalOpen: true,
            crfModalOpen: false // CRF 모달은 닫힌 상태로 시작
        });
    };

    closeDateModal = () => this.setState({ visitDateModalOpen: false });
    closeCrfModal  = () => this.setState({ crfModalOpen: false });
    closePortletModal = () => this.setState({ portletModal: false });

    // DB 저장 (API 호출)
    saveVisitToDB = async ({subjectId, visitDefinitionId, date, visitEventId}) => {
        const res = await apiPOST("saveVisit", {
            subjectId,
            visitDefinitionId,
            eventDate: date,
            visitEventId: visitEventId
            // status: "Completed" 
        });
        if (!res || res.ok === false) throw new Error(res?.error || "save_failed");
        return Number(res.visitEventId || 0);
    };

    // 로컬 State 업데이트
    upsertLocalVisit = ({subjectId, visitDefinitionId, eventDate, visitEventId}) => {
        this.setState(prev => {
            const next = [...prev.visits];
            const idx = next.findIndex(v => v.subjectId === subjectId && v.visitDefinitionId === visitDefinitionId);
            
            if (idx >= 0) {
                // Update
                next[idx] = { ...next[idx], eventDate, visitEventId: visitEventId ?? next[idx].visitEventId };
            } else {
                // Insert (새로 추가된 경우)
                next.push({
                    subjectId, 
                    visitDefinitionId, 
                    eventDate, 
                    visitEventId,
                    planDate: "" // planDate는 서버에서 가져오거나 기존 정의 참조
                });
            }
            return { visits: next };
        });
    };

    saveDateOnly = async () => {
        const { targetSubjectId, visitDateForm, visits } = this.state;
        if (!targetSubjectId || !visitDateForm.date) return;
    
        // 현재 수정 중인 visit 찾기
        const currentVisit = visits.find(
            v => v.subjectId === targetSubjectId &&
                 v.visitDefinitionId === visitDateForm.visitDefinitionId
        );
        const currentVisitEventId = currentVisit?.visitEventId;
    
        try {
            const newId = await this.saveVisitToDB({
                subjectId: targetSubjectId,
                visitDefinitionId: visitDateForm.visitDefinitionId,
                date: visitDateForm.date,
                visitEventId: currentVisitEventId
            });
            
            this.upsertLocalVisit({
                subjectId: targetSubjectId,
                visitDefinitionId: visitDateForm.visitDefinitionId,
                eventDate: visitDateForm.date,
                visitEventId: newId
            });
            
            this.closeDateModal();
        } catch (e) {
            window.alert("저장 실패: " + e.message);
        }
    };

    goCrfStep = async () => {
        const { targetSubjectId, visitDateForm, targetDef, visits  } = this.state;
        
        // 유효성 검사
        if (!targetSubjectId || !visitDateForm.date) {
            alert("방문일을 입력해주세요.");
            return;
        }
    
        const currentVisit = visits.find(
            v => v.subjectId === targetSubjectId &&
                 v.visitDefinitionId === visitDateForm.visitDefinitionId
        );
        const currentVisitEventId = currentVisit?.visitEventId;

        try {
            // 1. DB에 날짜 저장
            const newId = await this.saveVisitToDB({
                subjectId: targetSubjectId,
                visitDefinitionId: visitDateForm.visitDefinitionId,
                date: visitDateForm.date,
                visitEventId: currentVisitEventId
            });
    
            // 2. 로컬 화면(Table) 갱신
            this.upsertLocalVisit({
                subjectId: targetSubjectId,
                visitDefinitionId: visitDateForm.visitDefinitionId,
                eventDate: visitDateForm.date,
                visitEventId: newId
            });
    
            // 3. 날짜 모달 닫기 & CRF 모달 열기
            // [핵심] API 호출(loadCrfOptions)을 제거하고 바로 모달 상태만 변경
            this.setState({ 
                visitDateModalOpen: false,
                crfModalOpen: true 
            });
    
        } catch (e) {
            window.alert("저장 실패: " + e.message);
        }
    };

    deployCrfEntry = async (crfId) => {
    const { targetSubjectId, visitDateForm } = this.state;
        //const url = `/crf/${crfId}?subject=${targetSubjectId}&visit=${encodeURIComponent(visitDateForm.visitName)}`;
        // 라우팅 이동 로직은 프로젝트 라우터에 맞게 연결
        //여기에서 
        
        const workbench = this.workbench;

        console.log('created workbench: ', workbench);

        //CRFId를 

        this.workingPortletInstance = await workbench.loadPortlet({ //CRF를 클릭 시, 이 함수를 호출. 클릭한 CRF의 정보에 따라 아래 값들을 변경하도록 호출
            portletRootTag:this.portletRef,
            portletName: PortletKeys.STRUCTURED_DATA_EDITOR,
            params: {
            structuredDataId: 0, //SubCRFData의 ID
            dataTypeId: 34907, //SubCRF의 ID
            dataSetId: 35302, //DataSet의 ID -> visit crf
            dataCollectionId: 35305,
            dataStructureId: 34909 //SubCRFForm의 ID
            }
        })
        console.log('crfId', crfId);
        console.log('workingPortletInstance: ', this.workingPortletInstance);
        
        this.setState({ crfModalOpen: false, portletModal: true });
    };

    loadCrfOptions = async (visitName) => {
    this.setState({ crfLoading: true, crfError: null });
    try {
        const items = asItems(await apiGET("crfOptions", { visitNum: visitName }));
        this.setState({
        crfOptions: items.map(x => ({
            crfId: String(x.crfId || ""),
            crfName: String(x.crfName || x.crfId || "")
        }))
        });
    } catch (e) {
        this.setState({ crfError: String(e), crfOptions: [] });
    } finally {
        this.setState({ crfLoading: false });
    }
    };

    render() {

        const {
            subjectsLoading, subjectsError,
            visitsLoading, visitsError,
            subjectVisitDefinitionLoading,
            subjectVisitDefinitionError, subjectVisitDefinitions,
            visits, visitDateForm, visitDateMode,
            visitDateModalOpen, crfModalOpen, portletModal, field, q
        } = this.state;

        const selectedSubject = this.selectedSubject;
        const filtered = this.filteredSubjects;
        const institutionName = (this.state.institutions && this.state.institutions.length > 0) ? this.state.institutions[0].name : "";
        const experimentalGroupName = (this.state.experimentalGroups && this.state.experimentalGroups.length > 0) ? this.state.experimentalGroups[0].name : "";

        const visitsForSubject = selectedSubject ? this.state.visits.filter(v => v.subjectId === selectedSubject.subjectId) : [];
        const svdMap = new Map( subjectVisitDefinitions.map(def => [def.subjectVisitDefinitionId, def]) );

        // visitDefinition에 연결된 SubjectVisitDefinition.order 기준으로 정렬
        const sortedVisitsForSubject = visitsForSubject.slice().sort((a, b) => {
            const defA = svdMap.get(a.visitDefinitionId);
            const defB = svdMap.get(b.visitDefinitionId);
        
            const orderA = defA ? Number(defA.order) || 0 : 0;
            const orderB = defB ? Number(defB.order) || 0 : 0;
        
            // 1차 기준: order 오름차순
            if (orderA !== orderB) return orderA - orderB;
        
            // 2차 기준: 동일 order일 때 visitEventId 오름차순 (원하면 planDate 등으로 바꿔도 됨)
            return (a.visitEventId || 0) - (b.visitEventId || 0);
        });


        // Modal Contents
        const dateModalBody = (
            <div>
                <div className="mb-2">
                <div className="mb-1">방문명</div>
                <ClayInput readOnly value={visitDateForm.visitName} />
                </div>
                <div className="mb-2">
                <div className="mb-1">방문일</div>
                <ClayInput
                    type="date"
                    value={visitDateForm.date}
                    onChange={(e)=>this.setState({ visitDateForm: { ...visitDateForm, date: e.target.value } })}
                />
                </div>
                {visitDateMode === "edit" && (
                <div className="text-secondary small">날짜만 수정하려면 "저장". CRF 입력은 "CRF 입력".</div>
                )}
            </div>
        );
        
        const dateModalFooter =
        visitDateMode === "edit" ? (
            <>
            <Button displayType="primary" onClick={this.saveDateOnly}>저장</Button>
            <Button displayType="secondary" onClick={this.goCrfStep}>CRF 입력</Button>
            <Button displayType="secondary" onClick={this.closeDateModal}>취소</Button>
            </>
        ) : (
            <>
            <Button displayType="primary" onClick={this.goCrfStep}>다음</Button>
            <Button displayType="secondary" onClick={this.closeDateModal}>취소</Button>
            </>
        );

        // 현재 선택된 정의에서 CRF ID 추출
        const targetCrfId = this.state.targetDef?.visitCRFId;   

        const crfModalBody = (
            <div className="d-grid gap-2">
                <div className="alert alert-light" role="alert">
                     방문일({this.state.visitDateForm.date})이 저장되었습니다.<br/>
                     CRF 입력을 진행하시겠습니까?
                </div>
        
                {/* visitCRFId가 유효한 경우 버튼 표시 */}
                {targetCrfId && targetCrfId > 0 ? (
                    <Button
                        className="w-100"
                        displayType="primary"
                        onClick={() => this.deployCrfEntry(targetCrfId)}
                    >
                        CRF 입력 (ID: {targetCrfId})
                    </Button>
                ) : (
                    <div className="text-secondary text-center">
                        연결된 CRF(visitCRFId)가 없습니다.
                    </div>
                )}
            </div>
        );


        return(
            <Provider>
                <style>{css}</style>

                <div className="layout">
                    {/* Left Panel */}
                    <aside className="left">
                        <div className="left-title">■ 대상자 목록</div>
                        <div className="inline-label">기관: {this.userInstitutionName}</div>

                        <Form.Group className="mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <ClaySelect aria-label="search-field" value={field} onChange={(e) => this.setState({field: e.target.value})} style={{width:130}}>
                                <ClaySelect.Option label="ID" value="serialId" />
                                <ClaySelect.Option label="호칭" value="name" />
                                </ClaySelect>
                                <ClayInput placeholder="검색어를 입력하세요" value={q} onChange={(e)=>this.setState({q: e.target.value})} />
                                <Button displayType="secondary" className="btn-search">검색</Button>
                            </div>
                        </Form.Group>

                        <div className="count-bar">
                            <div>총 조회건수: <b>{filtered.length}</b></div>
                            {subjectsLoading && <div className="text-secondary small">로딩 중</div>}
                            {subjectsError && <div className="text-danger small">오류: {subjectsError}</div>}
                        </div>
                        <div className="left-table">
                            <ClayTable borderless hover responsiveSize="sm">
                                <ClayTable.Head>
                                    <ClayTable.Row>
                                        <ClayTable.Cell headingCell>대상자ID</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>호칭</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>무작위 번호</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>상태</ClayTable.Cell>
                                    </ClayTable.Row>
                                </ClayTable.Head>
                                <ClayTable.Body>
                                    {filtered.map(p => {
                                        const active = p.subjectId === (this.state.selectedSubjectId);
                                        return (
                                        <ClayTable.Row
                                            key={p.subjectId}
                                            onClick={() => this.handleRowClick(p.subjectId)}
                                            className={active ? "row-active" : ""}
                                            style={{cursor:"pointer"}}
                                        >
                                            <ClayTable.Cell>{p.serialId}</ClayTable.Cell>
                                            <ClayTable.Cell>{p.name}</ClayTable.Cell>
                                            <ClayTable.Cell>{p.randNo}</ClayTable.Cell>
                                            <ClayTable.Cell>{p.subjectStatus}</ClayTable.Cell>
                                        </ClayTable.Row>
                                        );
                                    })}
                                    {filtered.length === 0 && !subjectsLoading && (
                                        <ClayTable.Row>
                                        <ClayTable.Cell colSpan={4} className="text-center text-secondary">
                                            데이터 없음
                                        </ClayTable.Cell>
                                        </ClayTable.Row>
                                    )}
                                </ClayTable.Body>
                            </ClayTable>
                        </div>
                    </aside>

                    {/* Right Panel */}
                    <section className="right">
                        <div className="info">
                            <div className="info-row info-row-3">
                                <div className="label">기관</div>
                                <div className="value">{institutionName}</div>
                                <div className="label">대상자ID</div>
                                <div className="value">{selectedSubject?.serialId || ""}</div>
                                <div className="label">호칭</div>
                                <div className="value">{selectedSubject?.name || ""}</div>
                            </div>
                            <div className="info-row info-row-3">
                                <div className="label">상태</div>
                                <div className="value">{selectedSubject?.subjectStatus || ""}</div>
                                <div className="label">서면동의일</div>
                                <div className="value">{selectedSubject?.consentAgreeDate || ""}</div>
                                <div className="label">무작위 번호</div>
                                <div className="value">{selectedSubject?.randNo || ""}</div>
                            </div>
                        </div>

                        <div className="schedule-wrap">
                            <ClayTable borderless responsiveSize="sm">
                                <ClayTable.Head>
                                    <ClayTable.Row>
                                        <ClayTable.Cell headingCell className="sticky-col">방문명</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>방문 예정일</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>실제 방문일</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>Window 위반 여부</ClayTable.Cell>
                                        <ClayTable.Cell headingCell>Query 여부</ClayTable.Cell>
                                    </ClayTable.Row>
                                </ClayTable.Head>
                                
                                <ClayTable.Body>
                                    {/* Print State */}
                                    {!selectedSubject && (
                                        <ClayTable.Row>
                                            <ClayTable.Cell colSpan={5} className="text-secondary">
                                                대상자 목록에서 대상자를 선택해 주세요.
                                            </ClayTable.Cell>
                                        </ClayTable.Row>
                                    )}
                                    {visitsLoading && subjectVisitDefinitionLoading && selectedSubject && (
                                        <ClayTable.Row>
                                            <ClayTable.Cell colSpan={5} className="text-secondary">
                                                Loading...
                                            </ClayTable.Cell>
                                        </ClayTable.Row>
                                    )}
                                    {visitsError && subjectVisitDefinitionError && selectedSubject && (
                                        <ClayTable.Row>
                                            <ClayTable.Cell colSpan={5} className="text-secondary">
                                                오류가 발생했습니다. 다시 시도해 주세요. 오류가 반복된다면 관리자에게 문의 바랍니다.
                                            </ClayTable.Cell>
                                        </ClayTable.Row>
                                    )}

                                    {/* Data Render */}
                                    {selectedSubject && !visitsLoading && sortedVisitsForSubject.map(v => {
                                        const def = svdMap.get(v.visitDefinitionId);
                                        const queryInfo = this.state.queryLinkInfos[v.visitDefinitionId];

                                        return (
                                            <ClayTable.Row key={v.visitEventId}>
                                                {/* 방문명 */}
                                                <ClayTable.Cell>{def ? def.name : "-"}</ClayTable.Cell>

                                                {/* 방문 예정일 */}
                                                <ClayTable.Cell>{v.planDate || "-"}</ClayTable.Cell>

                                                {/* 실제 방문일 + 수정 버튼 */}
                                                <ClayTable.Cell>
                                                    {v.eventDate ? (
                                                        <Button
                                                            displayType="secondary"
                                                            size="sm"
                                                            onClick={() => this.openDateModal(def, v.eventDate)}
                                                        >
                                                            {v.eventDate}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            displayType="primary"
                                                            size="sm"
                                                            onClick={() => this.openDateModal(def, "")}
                                                        >
                                                            추가
                                                        </Button>
                                                    )}
                                                </ClayTable.Cell>

                                                {/* Window 위반 여부 */}
                                                <ClayTable.Cell>
                                                    {v.eventDate
                                                        ? checkWindowStatus(
                                                            v.eventDate,
                                                            v.planDate,
                                                            def ? def.windowMinus : 0,
                                                            def ? def.windowPlus : 0
                                                        )
                                                        : "-"
                                                    }
                                                </ClayTable.Cell>

                                                {/* Query 여부 */}
                                                <ClayTable.Cell>
                                                    {v.eventDate ? (
                                                        queryInfo ? (
                                                            queryInfo.hasQuery ? (
                                                                <span className="text-danger font-weight-bold">
                                                                    Yes ({queryInfo.queryCount})
                                                                </span>
                                                            ) : (
                                                                <span className="text-secondary">No</span>
                                                            )
                                                        ) : (
                                                            <span className="text-muted small">...</span>
                                                        )
                                                    ) : (
                                                        "-"
                                                    )}
                                                </ClayTable.Cell>
                                            </ClayTable.Row>
                                        );
                                    })}

                                    {selectedSubject && !visitsLoading && sortedVisitsForSubject.length === 0 && (
                                        <ClayTable.Row>
                                            <ClayTable.Cell colSpan={5} className="text-secondary text-center">
                                                등록된 방문 일정이 없습니다.
                                            </ClayTable.Cell>
                                        </ClayTable.Row>
                                    )}
                                </ClayTable.Body>
                            </ClayTable>
                        </div>
                    </section>
                </div>

                {/* Modals */}
                <ControlledModal
                    open={visitDateModalOpen}
                    title="방문일 설정"
                    size="sm"
                    spritemap={this.spritemapPath}
                    className="modal-offset"
                    onClose={this.closeDateModal}
                    body={dateModalBody}
                    footer={dateModalFooter}
                />

                <ControlledModal
                    open={crfModalOpen}
                    title="CRF 선택"
                    size="sm"
                    spritemap={this.spritemapPath}
                    className="modal-offset"
                    onClose={this.closeCrfModal}
                    body={crfModalBody}
                    footer={<Button displayType="secondary" onClick={this.closeCrfModal}>닫기</Button>}
                />

                {portletModal && this.workingPortletInstance && (
                    <ControlledModal
                        open={true}
                        title="CRF 입력"
                        size="lg"
                        spritemap={this.spritemapPath}
                        className="modal-offset"
                        onClose={this.closePortletModal}
                        body={
                            <SXPortlet
                                key={this.workingPortletInstance.namespace}
                                namespace={this.namespace}
                                portletContent={this.workingPortletInstance.content}
                                portletNamespace={this.workingPortletInstance.namespace}
                            />
                        }
                        footer={<Button displayType="secondary" onClick={this.closePortletModal}>닫기</Button>}
                    />
                )}

            </Provider>
        );
    }
}

const css = `
/*공통*/
.layout { display:flex; gap:12px; }
.left {
  width:600px; border:1px solid #e5e7eb; border-radius:8px; background:#fafbfc;
  display:flex; flex-direction:column; padding:10px; font-size:1rem; line-height:1.4;
}
.left-title { font-weight:600; color:#0b5fff; margin-bottom:8px; font-size:1.1rem }
.count-bar { display:flex; align-items:center; justify-content:space-between; margin:6px 0 8px; }
.left-table { overflow:auto; max-height:380px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; }
.left-table table th, .left-table table td {
  font-size: 1rem; line-height: 1.45; padding-top: 10px; padding-bottom: 10px;
}
.left-table table th { font-weight: 600; color: #0f172a; }
.row-active { background:#e7f3ff; }
.right { flex:1; border:1px solid #e5e7eb; border-radius:8px; background:#fff; display:flex; flex-direction:column; }
.info { display:grid; gap:10px; padding:12px 10px; border-bottom:1px solid #e5e7eb; background:#f8fafc; }
.info-row { display:grid; align-items:center; column-gap:12px; row-gap:6px; }
.info-row-3 { grid-template-columns:90px 1fr 90px 1fr 90px 1fr; }
.label { color:#475569; text-align:right; font-size:0.95rem; }
.value { color:#0f172a; font-weight:600; font-size:1.1rem; }
.inline-group { display:flex; align-items:center; gap:8px; }
.inline-group .inline-label { margin:0; width:90px; text-align:right; color:#475569; }
.btn-search { white-space:nowrap; min-width:72px; }


.schedule-wrap { background:#fff; border-top:1px solid #e5e7eb; max-height:420px; overflow-y:auto; overflow-x:hidden; }
.sticky-col { position:sticky; left:0; z-index:1; background:#f1f5f9; font-weight:600; min-width:120px; }
.linklike-btn { background:none; border:none; padding:0; cursor:pointer; text-decoration:underline; color:#0b5fff; font-size:0.9rem; }
.inline-group select.form-control { flex:1; }


/* Modal을 화면에서 조금 아래로 */
.modal.modal-offset .modal-dialog {
  margin: clamp(64px, 24vh, 288px) auto 0;
}
`