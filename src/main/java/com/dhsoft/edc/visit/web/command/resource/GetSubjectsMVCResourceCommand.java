package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.Subject;
import com.dhsoft.edc.backend.service.SubjectLocalServiceUtil;

import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;

import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;

import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;

import java.util.List;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;

@Component(
        immediate = true,
        property = {
                "javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
                "mvc.command.name=/edc/getSubjects"
        },
        service = MVCResourceCommand.class
)
public class GetSubjectsMVCResourceCommand extends BaseMVCResourceCommand {

    private static final Log _log =
            LogFactoryUtil.getLog(GetSubjectsMVCResourceCommand.class);

    @Override
    protected void doServeResource(ResourceRequest req, ResourceResponse res)
            throws Exception {

        long groupId = ParamUtil.getLong(req, "groupId");
        long projectId = ParamUtil.getLong(req, "projectId");

        _log.info("===== [GetSubjects] 호출됨 =====");
        _log.info("  ▶ groupId   = " + groupId);
        _log.info("  ▶ projectId = " + projectId);

        // ------------------------
        // DB 조회
        // ------------------------
        List<Subject> list = SubjectLocalServiceUtil.getG_P(groupId, projectId);

        _log.info("  ▶ 조회된 Subject 개수 = " + list.size());

        JSONArray arr = JSONFactoryUtil.createJSONArray();

        for (Subject s : list) {

            _log.info("    ● Subject 데이터");
            _log.info("        - subjectId = " + s.getSubjectId());
            _log.info("        - serialId  = " + s.getSerialId());
            _log.info("        - name      = " + s.getName());
            _log.info("        - expGroupId= " + s.getExpGroupId());
            _log.info("        - groupId   = " + s.getGroupId());
            _log.info("        - projectId = " + s.getProjectId());

            JSONObject o = JSONFactoryUtil.createJSONObject();
            o.put("subjectId", s.getSubjectId());
            o.put("name", s.getName());
            o.put("serialId", s.getSerialId());
            o.put("expGroupId", s.getExpGroupId());

            arr.put(o);
        }

        // ------------------------
        // JSON 반환 로그
        // ------------------------
        _log.info("===== [GetSubjects] 최종 JSON =====");
        _log.info(arr.toJSONString());

        // ------------------------
        // 응답 작성
        // ------------------------
        res.setContentType("application/json; charset=UTF-8");
        res.getWriter().write(arr.toJSONString());
    }
}
