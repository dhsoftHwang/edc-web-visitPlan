package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.ExperimentalGroup;
import com.dhsoft.edc.backend.service.ExperimentalGroupLocalServiceUtil;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;

import java.util.List;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;

@Component(
    immediate = true,
    property = {
        "javax.portlet.name=edcvisitweb",
        "mvc.command.name=/edc/getGroups"
    },
    service = MVCResourceCommand.class
)
public class GetGroupsMVCResourceCommand extends BaseMVCResourceCommand {

    @Override
    protected void doServeResource(ResourceRequest resourceRequest, ResourceResponse resourceResponse)
            throws Exception {

        long groupId = ParamUtil.getLong(resourceRequest, "groupId");
        long projectId = ParamUtil.getLong(resourceRequest, "projectId");

        System.out.println("🔍 [GetGroups] 요청됨");
        System.out.println("   ▶ groupId  = " + groupId);
        System.out.println("   ▶ projectId = " + projectId);

        // 서비스 호출
        List<ExperimentalGroup> list =
                ExperimentalGroupLocalServiceUtil.getByGroupId(groupId);

        System.out.println("🔍 [GetGroups] DB 조회 결과 개수 = " + list.size());

        JSONArray arr = JSONFactoryUtil.createJSONArray();

        for (ExperimentalGroup g : list) {
            JSONObject obj = JSONFactoryUtil.createJSONObject();
            obj.put("experimentalGroupId", g.getExperimentalGroupId());
            obj.put("name", g.getName());
            obj.put("expCode", g.getExpCode());
            obj.put("description", g.getDescription());

            arr.put(obj);

            System.out.println("   ▶ 반환 항목: " + obj.toJSONString());
        }

        resourceResponse.setContentType("application/json");
        resourceResponse.getWriter().write(arr.toJSONString());
    }
}
