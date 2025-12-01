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

import java.util.List;   // 🔥 추가

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

        String anchorType = ParamUtil.getString(request, "anchorType", "ConsentDate");

        int offset = ParamUtil.getInteger(request, "offset");
        int windowMinus = ParamUtil.getInteger(request, "windowMinus");
        int windowPlus = ParamUtil.getInteger(request, "windowPlus");

        // --------------------------------------------------------
        // 🔥 1) 현재 그룹의 VisitDefinition 목록을 조회해서
        //      가장 큰 order 값 계산
        // --------------------------------------------------------
        List<VisitDefinition> existingList =
                _visitDefinitionLocalService.getByExperimentalGroup(experimentalGroupId);

        int nextOrder = 0;
        for (VisitDefinition d : existingList) {
            // null 대비 + 최대값 계산
            int o = d.getOrder();
            if (o >= nextOrder) {
                nextOrder = o + 1;
            }
        }

        // --------------------------------------------------------
        // 2) VisitDefinition 생성
        // --------------------------------------------------------
        VisitDefinition vd =
                _visitDefinitionLocalService.addVisitDefinitionForGroup(
                        td.getCompanyId(),
                        td.getScopeGroupId(),
                        td.getUserId(),
                        td.getUser().getFullName(),
                        experimentalGroupId,
                        name,
                        anchorType,     // ★ STRING 저장
                        offset,
                        windowMinus,
                        windowPlus
                );

        // --------------------------------------------------------
        // 🔥 3) 계산한 order 값 세팅 후 update
        // --------------------------------------------------------
        vd.setOrder(nextOrder);
        vd = _visitDefinitionLocalService.updateVisitDefinition(vd);

        JSONObject result = JSONFactoryUtil.createJSONObject();
        result.put("success", true);
        result.put("visitDefinitionId", vd.getVisitDefinitionId());
        result.put("order", vd.getOrder());

        response.setContentType("application/json");
        response.getWriter().write(result.toString());
    }

}
