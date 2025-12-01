package com.dhsoft.edc.visit.web.command.resource;


import com.dhsoft.edc.backend.service.VisitDefinitionLocalService;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.portlet.bridges.mvc.BaseMVCResourceCommand;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.util.ParamUtil;

import java.io.BufferedReader;
import java.io.PrintWriter;

import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
@Component(
	    immediate = true,
	    property = {
	        "javax.portlet.name=edcvisitweb",
	        "mvc.command.name=/edc/updateVisitDefinitionBatch"
	    },
	    service = MVCResourceCommand.class
	)
	public class UpdateVisitDefinitionBatchMVCResourceCommand extends BaseMVCResourceCommand {

	    @Reference
	    private VisitDefinitionLocalService _visitDefinitionLocalService;

	    @Override
	    protected void doServeResource(ResourceRequest req, ResourceResponse res) throws Exception {

	        String body = req.getReader().lines().reduce("", (a,b) -> a + b);
	        JSONObject json = JSONFactoryUtil.createJSONObject(body);

	        JSONArray arr = json.getJSONArray("items");

	        for (int i = 0; i < arr.length(); i++) {
	            JSONObject o = arr.getJSONObject(i);

	            long id = o.getLong("visitDefinitionId");
	            String name = o.getString("name");
	            String anchorType = o.getString("anchorType");
	            int offset = o.getInt("offset");
	            int windowMinus = o.getInt("windowMinus");
	            int windowPlus = o.getInt("windowPlus");

	            _visitDefinitionLocalService.updateVisitDefinitionBasic(
	                id, name, anchorType, offset, windowMinus, windowPlus
	            );
	        }

	        JSONObject result = JSONFactoryUtil.createJSONObject();
	        result.put("success", true);

	        res.setContentType("application/json");
	        res.getWriter().write(result.toString());
	    }
	}

