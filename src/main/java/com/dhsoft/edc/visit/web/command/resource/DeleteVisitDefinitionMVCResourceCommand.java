package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;

import java.io.PrintWriter;
import java.util.Enumeration;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(
    immediate = true,
    property = {
        "javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
        "mvc.command.name=/edc/deleteVisitDefinition"
    },
    service = MVCResourceCommand.class
)
public class DeleteVisitDefinitionMVCResourceCommand
        extends BaseMVCResourceCommand {

    @Reference
    private VisitDefinitionLocalService _visitDefinitionLocalService;

    @Override
    protected void doServeResource(
            ResourceRequest resourceRequest,
            ResourceResponse resourceResponse) throws Exception {

        // 🔍 디버그: 실제 넘어오는 파라미터 확인
        Enumeration<String> names = resourceRequest.getParameterNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            System.out.println("### [DeleteVisitDefinition] param " + name + " = "
                    + java.util.Arrays.toString(resourceRequest.getParameterValues(name)));
        }

        // namespace 제거 → 순수 파라미터명으로 읽기
        long visitDefinitionId = ParamUtil.getLong(resourceRequest, "visitDefinitionId");

        JSONObject result = JSONFactoryUtil.createJSONObject();

        try {
            _visitDefinitionLocalService.deleteVisitDefinitionById(visitDefinitionId);

            result.put("success", true);
        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        resourceResponse.setContentType("application/json");
        PrintWriter writer = resourceResponse.getWriter();
        writer.write(result.toString());
        writer.flush();
        writer.close();
    }
}
