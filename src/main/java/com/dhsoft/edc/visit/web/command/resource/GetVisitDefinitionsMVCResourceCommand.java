package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.VisitDefinition;
import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
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
import org.osgi.service.component.annotations.Reference;

@Component(
    immediate = true,
    property = {
        "javax.portlet.name=edcvisitweb",
        "mvc.command.name=/edc/getVisitDefinitions"
    },
    service = MVCResourceCommand.class
)
public class GetVisitDefinitionsMVCResourceCommand extends BaseMVCResourceCommand {

    @Reference
    private VisitDefinitionLocalService _visitDefinitionLocalService;

    @Override
    protected void doServeResource(ResourceRequest request, ResourceResponse response)
            throws Exception {

        long experimentalGroupId = ParamUtil.getLong(request, "experimentalGroupId");

        List<VisitDefinition> list =
                _visitDefinitionLocalService.getByExperimentalGroup(experimentalGroupId);

        JSONArray arr = JSONFactoryUtil.createJSONArray();

        for (VisitDefinition v : list) {
            JSONObject o = JSONFactoryUtil.createJSONObject();

            o.put("visitDefinitionId", v.getVisitDefinitionId());
            o.put("name", v.getName());

            // ⚠ anchorType → STRING으로 통일
            String anchor = v.getAnchorType();
            o.put("anchorType", anchor == null ? "" : anchor);

            o.put("offset", v.getOffset());
            o.put("windowMinus", v.getWindowMinus());
            o.put("windowPlus", v.getWindowPlus());
            o.put("order", v.getOrder()); // 정렬용

            arr.put(o);
        }

        response.setContentType("application/json");
        response.getWriter().write(arr.toString());
    }
}
