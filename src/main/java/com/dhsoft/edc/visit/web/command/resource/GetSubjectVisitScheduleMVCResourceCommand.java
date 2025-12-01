package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.Subject;
import com.dhsoft.edc.backend.model.ExperimentalGroup;
import com.dhsoft.edc.backend.model.SubjectVisitDefinition;
import com.dhsoft.edc.backend.model.VisitDefinition;
import com.dhsoft.edc.backend.service.SubjectLocalService;
import com.dhsoft.edc.backend.service.ExperimentalGroupLocalService;
import com.dhsoft.edc.backend.service.SubjectVisitDefinitionLocalService;
import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;

import java.io.PrintWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(
        immediate = true,
        property = {
                "javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
                "mvc.command.name=/edc/getSubjectVisitSchedule"
        },
        service = MVCResourceCommand.class
)
public class GetSubjectVisitScheduleMVCResourceCommand
        extends BaseMVCResourceCommand {

    private static final Log _log =
            LogFactoryUtil.getLog(GetSubjectVisitScheduleMVCResourceCommand.class);

    @Reference private SubjectLocalService subjectLocalService;
    @Reference private ExperimentalGroupLocalService experimentalGroupLocalService;
    @Reference private VisitDefinitionLocalService visitDefinitionLocalService;
    @Reference private SubjectVisitDefinitionLocalService subjectVisitDefinitionLocalService;

    @Override
    protected void doServeResource(ResourceRequest req, ResourceResponse res)
            throws Exception {

        res.setContentType("application/json; charset=UTF-8");
        JSONObject result = JSONFactoryUtil.createJSONObject();

        long subjectId = ParamUtil.getLong(req, "subjectId");

        _log.info("===== [getSubjectVisitSchedule] 호출됨 =====");
        _log.info("▶ subjectId = " + subjectId);

        if (subjectId <= 0) {
            result.put("success", false);
            result.put("message", "subjectId is required");
            writeJSON(res, result);
            return;
        }

        try {
            // 1) Subject
            Subject subject = subjectLocalService.getSubject(subjectId);

            long expGroupId = subject.getExpGroupId();
            _log.info("✔ Subject.expGroupId = " + expGroupId);

            JSONObject subjectJSON = JSONFactoryUtil.createJSONObject();
            subjectJSON.put("subjectId", subject.getSubjectId());
            subjectJSON.put("name", subject.getName());
            subjectJSON.put("serialId", subject.getSerialId());
            subjectJSON.put("applyDate", subject.getApplyDate());
            subjectJSON.put("consentAgreeDate", subject.getConsentAgreeDate());
            subjectJSON.put("expGroupId", expGroupId);

            // 2) Experimental Group
            ExperimentalGroup expGroup =
                    experimentalGroupLocalService.getExperimentalGroup(expGroupId);
            String expCode = expGroup.getExpCode();
            _log.info("✔ ExperimentalGroup.expCode = " + expCode);

            // 3) VisitDefinition (expCode 기준)
            List<VisitDefinition> visitDefs =
                    visitDefinitionLocalService.getByVisitDefinitionCode(expCode);
            _log.info("✔ VisitDefinition 개수 = " + visitDefs.size());

            // 4) SubjectVisitDefinition (subjectId 기준)
            List<SubjectVisitDefinition> svdList =
                    subjectVisitDefinitionLocalService.getBySubjectId(subjectId);
            _log.info("✔ SubjectVisitDefinition 개수 = " + svdList.size());

            // ★★ 핵심 수정 ★★
            // visitDefinitionCode 하나만 쓰면 VISIT01 하나로 덮여버리니까,
            // visitDefinitionCode + name (또는 order_) 조합으로 key 생성
            Map<String, SubjectVisitDefinition> svdMap = new HashMap<>();
            for (SubjectVisitDefinition svd : svdList) {
                String key = makeKey(svd.getVisitDefinitionCode(), svd.getName());
                svdMap.put(key, svd);
            }

            // 5) 기본 방문 병합
            JSONArray visitArray = JSONFactoryUtil.createJSONArray();

            for (VisitDefinition vd : visitDefs) {

                JSONObject vJSON = JSONFactoryUtil.createJSONObject();
                vJSON.put("visitDefinitionId", vd.getVisitDefinitionId());
                vJSON.put("visitDefinitionCode", vd.getVisitDefinitionCode());
                vJSON.put("name", vd.getName());

                String key = makeKey(vd.getVisitDefinitionCode(), vd.getName());
                SubjectVisitDefinition svd = svdMap.get(key);

                // order
                int order;
                if (svd != null) {
                    int svdOrder = 0;
                    try {
                        svdOrder = Integer.parseInt(svd.getOrder());
                    } catch (Exception ignore) {}
                    order = (svdOrder > 0) ? svdOrder : vd.getOrder();
                } else {
                    order = vd.getOrder();
                }
                vJSON.put("order", order);

                // anchor / offset / window
                if (svd != null) {
                    vJSON.put("anchorType", svd.getAnchorType());
                    vJSON.put("offset", svd.getOffset());
                    vJSON.put("windowMinus", svd.getWindowMinus());
                    vJSON.put("windowPlus", svd.getWindowPlus());
                } else {
                    vJSON.put("anchorType", vd.getAnchorType());
                    vJSON.put("offset", vd.getOffset());
                    vJSON.put("windowMinus", vd.getWindowMinus());
                    vJSON.put("windowPlus", vd.getWindowPlus());
                }

                visitArray.put(vJSON);
            }

            // 6) Unscheduled Visits (visitDefinitionCode 비어 있고 offset==99)
            JSONArray unscheduledArray = JSONFactoryUtil.createJSONArray();

            for (SubjectVisitDefinition svd : svdList) {

                boolean hasVisitCode =
                        svd.getVisitDefinitionCode() != null &&
                        !svd.getVisitDefinitionCode().trim().isEmpty();

                boolean isUnscheduled = (svd.getOffset() == 99);

                if (!hasVisitCode && isUnscheduled) {
                    JSONObject uJSON = JSONFactoryUtil.createJSONObject();
                    uJSON.put("subjectVisitDefinitionId", svd.getSubjectVisitDefinitionId());
                    uJSON.put("name", svd.getName());
                    uJSON.put("order", svd.getOrder());
                    if (svd.getStatusDate() != null) {
                        uJSON.put("date", svd.getStatusDate().toString());
                    } else {
                        uJSON.put("date", "");
                    }
                    unscheduledArray.put(uJSON);
                }
            }

            // 7) 응답
            result.put("success", true);
            result.put("subject", subjectJSON);
            result.put("visits", visitArray);
            result.put("unscheduledVisits", unscheduledArray);

            _log.info("===== [최종 JSON 반환 완료] =====");
            _log.info(result.toString());

        } catch (Exception e) {
            _log.error("❌ getSubjectVisitSchedule 처리중 오류", e);
            result.put("success", false);
            result.put("message", e.getMessage());
        }

        writeJSON(res, result);
    }

    // visitDefinitionCode + name 으로 key 생성
    private String makeKey(String visitDefinitionCode, String name) {
        if (visitDefinitionCode == null) visitDefinitionCode = "";
        if (name == null) name = "";
        return visitDefinitionCode + "::" + name;
    }

    private void writeJSON(ResourceResponse response, JSONObject json)
            throws Exception {
        PrintWriter writer = response.getWriter();
        writer.write(json.toString());
        writer.flush();
    }
}
