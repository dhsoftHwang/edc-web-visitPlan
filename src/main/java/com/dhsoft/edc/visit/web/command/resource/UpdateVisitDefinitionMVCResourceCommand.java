package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;

import java.io.PrintWriter;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(
        immediate = true,
        property = {
                "javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
                "mvc.command.name=/edc/updateVisitDefinition"
        },
        service = MVCResourceCommand.class
)
public class UpdateVisitDefinitionMVCResourceCommand
        extends BaseMVCResourceCommand {

    @Reference
    private VisitDefinitionLocalService _visitDefinitionLocalService;

    @Override
    protected void doServeResource(
            ResourceRequest resourceRequest,
            ResourceResponse resourceResponse) throws Exception {

        // 🔥 디버그용: 실제 넘어오는 파라미터 찍어보기
        java.util.Enumeration<String> names = resourceRequest.getParameterNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            System.out.println("### [UpdateVisitDefinition] param " + name + " = "
                    + java.util.Arrays.toString(resourceRequest.getParameterValues(name)));
        }

        // ❌ String namespace = resourceResponse.getNamespace();
        // ❌ namespace + "visitDefinitionId" 이런거 전부 제거

        long visitDefinitionId = ParamUtil.getLong(
                resourceRequest, "visitDefinitionId");

        String name = ParamUtil.getString(
                resourceRequest, "name");

        int offset = ParamUtil.getInteger(
                resourceRequest, "offset", 0);

        int windowMinus = ParamUtil.getInteger(
                resourceRequest, "windowMinus", 0);

        int windowPlus = ParamUtil.getInteger(
                resourceRequest, "windowPlus", 0);

        JSONObject result = JSONFactoryUtil.createJSONObject();

        try {
            _visitDefinitionLocalService.updateVisitDefinitionBasic(
                    visitDefinitionId, name, offset, windowMinus, windowPlus);

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
