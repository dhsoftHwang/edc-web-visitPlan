package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.Subject;
import com.dhsoft.edc.backend.model.SubjectVisitDefinition;
import com.dhsoft.edc.backend.model.VisitEvent;
import com.dhsoft.edc.backend.service.SubjectLocalService;
import com.dhsoft.edc.backend.service.SubjectVisitDefinitionLocalService;
import com.dhsoft.edc.backend.service.VisitEventLocalService;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.counter.kernel.service.CounterLocalServiceUtil;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;

import java.util.*;
import java.util.stream.Collectors;
import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(
    immediate = true,
    property = {
        "javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
        "mvc.command.name=/edc/saveSubjectVisitDefinition"
    },
    service = MVCResourceCommand.class
)
public class SaveSubjectVisitDefinitionMVCResourceCommand extends BaseMVCResourceCommand {

    @Reference
    private SubjectVisitDefinitionLocalService subjectVisitDefinitionLocalService;

    @Reference
    private VisitEventLocalService visitEventLocalService;

    @Reference
    private SubjectLocalService subjectLocalService; // 🔥 동의일 조회용


    @Override
    protected void doServeResource(ResourceRequest req, ResourceResponse res)
            throws Exception {

        JSONObject result = JSONFactoryUtil.createJSONObject();
        result.put("success", false);

        try {

            String body = req.getReader().lines().collect(Collectors.joining());
            JSONObject json = JSONFactoryUtil.createJSONObject(body);

            long subjectId = json.getLong("subjectId");
            JSONArray arr = json.getJSONArray("visits");

            // --------------------------------------------------------------------
            // 📌 0. 기존 SubjectVisitDefinition 가져와서 key → oldId 매핑
            // --------------------------------------------------------------------
            List<SubjectVisitDefinition> oldDefs =
                subjectVisitDefinitionLocalService.getBySubjectId(subjectId);

            Map<String, Long> oldIdMap = new HashMap<>();

            for (SubjectVisitDefinition old : oldDefs) {
                String key = old.getVisitDefinitionCode() + ":" + old.getName();
                oldIdMap.put(key, old.getSubjectVisitDefinitionId());
            }

            // 📌 기존 데이터 삭제
            subjectVisitDefinitionLocalService.deleteBySubjectId(subjectId);

            List<SubjectVisitDefinition> defs = new ArrayList<>();

            // --------------------------------------------------------------------
            // 1) 모든 SubjectVisitDefinition INSERT (VisitEvent 저장 X)
            // --------------------------------------------------------------------
            for (int i = 0; i < arr.length(); i++) {

                JSONObject o = arr.getJSONObject(i);

                SubjectVisitDefinition def =
                    subjectVisitDefinitionLocalService.createSubjectVisitDefinition(0);

                def.setSubjectId(subjectId);

                String vCode = o.getString("visitDefinitionCode", "");
                String name = o.getString("name", "");

                def.setVisitDefinitionCode(vCode);
                def.setName(name);

                // ⭐ Key 생성
                String key = vCode + ":" + name;

                // ⭐ ID 재사용
                if (oldIdMap.containsKey(key)) {
                    def.setSubjectVisitDefinitionId(oldIdMap.get(key));
                } else {
                    def.setSubjectVisitDefinitionId(
                        CounterLocalServiceUtil.increment()
                    );
                }

                // ⭐ 프론트에서 받은 order 저장 (없으면 index 사용)
                int order = o.has("order") ? o.getInt("order") : i;
                def.setOrder(String.valueOf(order));

                def.setAnchorType(o.getString("anchorType"));
                def.setOffset(o.getInt("offset"));
                def.setWindowMinus(o.getInt("windowMinus"));
                def.setWindowPlus(o.getInt("windowPlus"));
                def.setCreateDate(new Date());
                def.setModifiedDate(new Date());

                // Unscheduled visit 의 실제 날짜(statusDate) 저장
                if (o.getInt("offset") == 99 && o.has("unscheduledDate")) {
                    try {
                        String d = o.getString("unscheduledDate");
                        def.setStatusDate(java.sql.Date.valueOf(d));
                    } catch (Exception ex) {
                        System.out.println("⚠ Unscheduled date parse error: " + ex.getMessage());
                    }
                }

                subjectVisitDefinitionLocalService.addSubjectVisitDefinition(def);
                defs.add(def);
            }

            // --------------------------------------------------------
            // 🔥 모든 def 를 만든 뒤 order 기준으로 정렬
            // --------------------------------------------------------
            defs.sort(Comparator.comparingInt(d -> {
                try {
                    return Integer.parseInt(d.getOrder());
                } catch (Exception e) {
                    return 999999; // order 없으면 맨 뒤로
                }
            }));

            // --------------------------------------------------------------------
            // 2) Subject 동의일(consentAgreeDate) 가져오기
            // --------------------------------------------------------------------
            Date consentAgreeDate = null;
            try {
                Subject subject = subjectLocalService.getSubject(subjectId);
                consentAgreeDate = subject.getConsentAgreeDate();
                if (consentAgreeDate == null) {
                    consentAgreeDate = subject.getApplyDate();
                }
            } catch (Exception e) {
                System.out.println("⚠ Subject load error: " + e.getMessage());
            }
            if (consentAgreeDate == null) {
                consentAgreeDate = new Date(); // fallback
            }

            // --------------------------------------------------------------------
            // 3) 정렬된 defs 순서대로 anchor + planDate 계산 및 VisitEvent 저장
            // --------------------------------------------------------------------
            // 이름 기준 planDate (예: "Baseline", "12w", "24w")
            Map<String, Date> planByName = new HashMap<>();
            // ID 기준 planDate (예: anchorType = "VISIT12345" 호환용)
            Map<Long, Date> planById = new HashMap<>();

            for (SubjectVisitDefinition def : defs) {

                String anchorType = def.getAnchorType();
                Date anchor = null;

                // 3-1) 동의일 기준 (Consent)
                if (anchorType == null || anchorType.trim().isEmpty()
                    || "ConsentDate".equalsIgnoreCase(anchorType)
                    || "CONSENT".equalsIgnoreCase(anchorType)) {

                    anchor = consentAgreeDate;
                }
                // 3-2) Unscheduled (실제 방문일 = statusDate)
                else if ("UNSCHEDULED".equalsIgnoreCase(anchorType)) {
                    anchor = def.getStatusDate();
                }
                // 3-3) VISIT<ID> 형식 (기존 포맷 호환)
                else if (anchorType.startsWith("VISIT")) {
                    try {
                        long anchorVisitId =
                            Long.parseLong(anchorType.substring("VISIT".length()));
                        anchor = planById.get(anchorVisitId);
                    } catch (Exception ignore) {}
                }
                // 3-4) 그 외 문자열은 "방문 이름"으로 간주 (예: "Baseline", "12w", "24w")
                else {
                    anchor = planByName.get(anchorType);
                }

                // 3-5) planDate 계산
                Date planDate = null;
                if (anchor != null) {
                    if ("UNSCHEDULED".equalsIgnoreCase(anchorType)) {
                        // Unscheduled 는 offset=99 이지만,
                        // planDate 는 실제 anchorDate(=statusDate) 그대로 사용
                        planDate = anchor;
                    } else {
                        Calendar cal = Calendar.getInstance();
                        cal.setTime(anchor);
                        cal.add(Calendar.DATE, def.getOffset());
                        planDate = cal.getTime();
                    }
                }

                // 3-6) 현재 def 의 이름/ID 로 planDate 저장 → 이후 방문들이 anchor 로 참조 가능
                if (def.getName() != null && !def.getName().isEmpty()) {
                    planByName.put(def.getName(), planDate);
                }
                planById.put(def.getSubjectVisitDefinitionId(), planDate);

                // 3-7) VisitEvent 저장
                saveOrUpdateVisitEvent(subjectId, def, anchor, planDate);
            }

            result.put("success", true);

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", e.getMessage());
        }

        res.setContentType("application/json");
        res.getWriter().write(result.toJSONString());
    }


    // ------------------------------------------------------------------------
    // VisitEvent 저장 로직 (planDate, anchorDate 모두 적용)
    // ------------------------------------------------------------------------
    private void saveOrUpdateVisitEvent(long subjectId,
                                        SubjectVisitDefinition def,
                                        Date anchorDate,
                                        Date planDate) {

        try {

            long visitDefinitionId = def.getSubjectVisitDefinitionId();

            List<VisitEvent> list =
                visitEventLocalService.findBySubjectIdAndVisitDefinitionId(
                    subjectId, visitDefinitionId
                );

            VisitEvent event;

            if (list.isEmpty()) {
                event = visitEventLocalService.createVisitEvent(
                    CounterLocalServiceUtil.increment()
                );
                event.setSubjectId(subjectId);
                event.setVisitDefinitionId(visitDefinitionId);
                event.setCreateDate(new Date());
            } else {
                event = list.get(0);
            }

            event.setModifiedDate(new Date());
            event.setAnchorType(def.getAnchorType());
            event.setOffset(def.getOffset());
            event.setAnchorDate(anchorDate);
            event.setPlanDate(planDate);

            visitEventLocalService.updateVisitEvent(event);

        } catch (Exception ex) {
            System.out.println("⚠ VisitEvent save error: " + ex.getMessage());
        }
    }

}
