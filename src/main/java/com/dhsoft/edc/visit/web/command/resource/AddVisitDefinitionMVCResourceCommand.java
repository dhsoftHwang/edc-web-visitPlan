package com.dhsoft.edc.visit.web.command.resource;


import com.dhsoft.edc.backend.model.VisitDefinition;
import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.theme.ThemeDisplay;
import com.liferay.portal.kernel.util.ParamUtil;
import com.liferay.portal.kernel.util.WebKeys;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(
        immediate = true,
        property = {
                "javax.portlet.name=edcvisitweb",
                "mvc.command.name=/edc/addVisitDefinition"
        },
        service = MVCResourceCommand.class
)
public class AddVisitDefinitionMVCResourceCommand extends BaseMVCResourceCommand {

    @Reference
    private VisitDefinitionLocalService _visitDefinitionLocalService;

    @Override
    protected void doServeResource(ResourceRequest request, ResourceResponse response)
            throws Exception {

        ThemeDisplay td = (ThemeDisplay)request.getAttribute(WebKeys.THEME_DISPLAY);

        long experimentalGroupId = ParamUtil.getLong(request, "experimentalGroupId");
        String name = ParamUtil.getString(request, "name");
        
        int offset =
                ParamUtil.getInteger(request, "offset");

        int windowMinus =
                ParamUtil.getInteger(request, "windowMinus");

        int windowPlus =
                ParamUtil.getInteger(request, "windowPlus");

        VisitDefinition vd =
                _visitDefinitionLocalService.addVisitDefinitionForGroup(
                        td.getCompanyId(),
                        td.getScopeGroupId(),
                        td.getUserId(),
                        td.getUser().getFullName(),
                        experimentalGroupId,
                        name,
                        offset,
                        windowMinus,
                        windowPlus
                );

        JSONObject result = JSONFactoryUtil.createJSONObject();
        result.put("success", true);
        result.put("visitDefinitionId", vd.getVisitDefinitionId());

        response.setContentType("application/json");
        response.getWriter().write(result.toString());
    }
}
