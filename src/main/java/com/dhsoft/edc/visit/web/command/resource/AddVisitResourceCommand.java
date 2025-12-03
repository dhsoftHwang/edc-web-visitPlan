package com.dhsoft.edc.visit.web.command.resource;

import com.dhsoft.edc.backend.model.ExperimentalGroup;
import com.dhsoft.edc.backend.model.Institution;
import com.dhsoft.edc.backend.model.QueryLink;
import com.dhsoft.edc.backend.model.Subject;
import com.dhsoft.edc.backend.model.SubjectVisitDefinition;
import com.dhsoft.edc.backend.model.VisitEvent;
import com.dhsoft.edc.backend.service.ExperimentalGroupLocalServiceUtil;
import com.dhsoft.edc.backend.service.InstitutionLocalServiceUtil;
import com.dhsoft.edc.backend.service.QueryLinkLocalServiceUtil;
import com.dhsoft.edc.backend.service.SubjectLocalServiceUtil;
import com.dhsoft.edc.backend.service.SubjectVisitDefinitionLocalServiceUtil;
import com.dhsoft.edc.backend.service.VisitEventLocalServiceUtil;
import com.dhsoft.edc.visit.web.constants.EdcVisitWebPortletKeys;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCResourceCommand;
import com.liferay.portal.kernel.theme.ThemeDisplay;
import com.liferay.portal.kernel.util.ContentTypes;
import com.liferay.portal.kernel.util.ParamUtil;
import com.liferay.portal.kernel.util.StringPool;
import com.liferay.portal.kernel.util.Validator;
import com.liferay.portal.kernel.util.WebKeys;
import com.sx.icecap.model.SetTypeLink;
import com.sx.icecap.service.CollectionSetLinkLocalServiceUtil;
import com.sx.icecap.service.SetTypeLinkLocalServiceUtil;
import com.sx.icecap.service.TypeStructureLinkLocalServiceUtil;

import java.io.PrintWriter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.portlet.PortletException;
import javax.portlet.ResourceRequest;
import javax.portlet.ResourceResponse;

import org.osgi.service.component.annotations.Component;

@Component(
		immediate = true,
		property = {
			"javax.portlet.name=" + EdcVisitWebPortletKeys.EdcVisitWeb,
			"mvc.command.name=/edc/addVisit",
			"com.liferay.portlet.requires-namespaced-parameters=false",
			"com.liferay.portlet.add-default-resource=true",
			"javax.portlet.security-role-ref=power-user,user,administrator"
		},
		service = MVCResourceCommand.class
)
public class AddVisitResourceCommand implements MVCResourceCommand {

	private static final Log _log = LogFactoryUtil.getLog(AddVisitResourceCommand.class);
	private static final SimpleDateFormat DATE = new SimpleDateFormat("yyyy-MM-dd");
	
	@Override
	public boolean serveResource(ResourceRequest resourceRequest, ResourceResponse resourceResponse)
			throws PortletException {
		// TODO Auto-generated method stub
		resourceResponse.setContentType(ContentTypes.APPLICATION_JSON);
		resourceResponse.setCharacterEncoding(StringPool.UTF8);
		
		Map<String, String []> pmap = resourceRequest.getParameterMap();
		
		String op = ParamUtil.getString(resourceRequest, "op");
        if (Validator.isNull(op)) op = ParamUtil.getString(resourceRequest, "action");
        if (Validator.isNull(op)) {
            for (String k : pmap.keySet()) {
                if (k.endsWith("op"))     { op = ParamUtil.getString(resourceRequest, k); break; }
                if (k.endsWith("action")) { op = ParamUtil.getString(resourceRequest, k); break; }
            }
        }
        if (Validator.isNull(op)) op = "subjects";
		
        ThemeDisplay td = (ThemeDisplay) resourceRequest.getAttribute(WebKeys.THEME_DISPLAY);
        long groupId = (td != null) ? td.getScopeGroupId() : 0;
        
        try (PrintWriter out = resourceResponse.getWriter()) {
        	
        	//Subject
        	if("subjects".equals(op)) {
        		long institutionId = ParamUtil.getLong(resourceRequest, "parameter");
        		List<Subject> subjectList = SubjectLocalServiceUtil.findByInstitution(institutionId);
        		JSONArray arr = JSONFactoryUtil.createJSONArray();
                for (Subject s : subjectList) {
                    JSONObject o = JSONFactoryUtil.createJSONObject();
                    o.put("subjectId", s.getSubjectId());
                    o.put("serialId", Validator.isNotNull(s.getSerialId()) ? s.getSerialId() : "");
                    o.put("name", Validator.isNotNull(s.getName()) ? s.getName() : "");
                    o.put("randNo", Validator.isNotNull(s.getRandomNo()) ? s.getRandomNo() : "");
                    o.put("institutionId", Validator.isNotNull(s.getInstitutionId()) ? s.getInstitutionId() : "");
                    o.put("subjectStatus", Validator.isNotNull(s.getSubjectStatus()) ? s.getSubjectStatus() : "");
                    o.put("subjectStatusApplyDate", s.getSubjectStatusApplyDate() != null ? DATE.format(s.getSubjectStatusApplyDate()) : "");
                    o.put("consentAgreeDate", s.getConsentAgreeDate() != null ? DATE.format(s.getConsentAgreeDate()) : "");
                    o.put("expGroupId", Validator.isNotNull(s.getExpGroupId()) ? s.getExpGroupId() : "");
                    o.put("applyDate", s.getApplyDate() != null ? DATE.format(s.getApplyDate()) : "");
                    arr.put(o);
                }
                out.write(arr.toString());
                return false;
        	}
        	
        	//VisitEvents
        	if("visits".equals(op)) {
        		long subjectId = ParamUtil.getLong(resourceRequest, "parameter");
        		List<VisitEvent> visitList = VisitEventLocalServiceUtil.findBySubjectId(subjectId);
        		_log.info("VisitEvents: " + visitList);
        		JSONArray arr = JSONFactoryUtil.createJSONArray();
                for (VisitEvent v : visitList) {
                    JSONObject o = JSONFactoryUtil.createJSONObject();
                    o.put("visitEventId", v.getVisitEventId());
                    o.put("companyId", v.getCompanyId());
                    o.put("groupId", Validator.isNotNull(v.getGroupId()) ? v.getGroupId() : "");
                    o.put("projectId", Validator.isNotNull(v.getProjectId()) ? v.getProjectId() : "");
                    o.put("institutionId", Validator.isNotNull(v.getInstitutionId()) ? v.getInstitutionId() : "");
                    o.put("subjectId", Validator.isNotNull(v.getSubjectId()) ? v.getSubjectId() : "");
                    o.put("visitDefinitionId", Validator.isNotNull(v.getVisitDefinitionId()) ? v.getVisitDefinitionId() : "");
                    o.put("userId", Validator.isNotNull(v.getUserId()) ? v.getUserId() : "");
                    o.put("userName", Validator.isNotNull(v.getUserName()) ? v.getUserName() : "");
                    o.put("createDate", v.getCreateDate() != null ? DATE.format(v.getCreateDate()) : "");
                    o.put("modifiedDate", v.getModifiedDate() != null ? DATE.format(v.getModifiedDate()) : "");
                    o.put("status", Validator.isNotNull(v.getStatus()) ? v.getStatus() : "");
                    o.put("statusByUserId", Validator.isNotNull(v.getStatusByUserId()) ? v.getStatusByUserId() : "");
                    o.put("statusByUserName", Validator.isNotNull(v.getStatusByUserName()) ? v.getStatusByUserName() : "");
                    o.put("statusDate", v.getStatusDate() != null ? DATE.format(v.getStatusDate()) : "");
                    o.put("anchorType", Validator.isNotNull(v.getAnchorType()) ? v.getAnchorType() : "");
                    o.put("anchorDate", v.getAnchorDate() != null ? DATE.format(v.getAnchorDate()) : "");
                    o.put("offset", Validator.isNotNull(v.getOffset()) ? v.getOffset() : "");
                    o.put("planDate", v.getPlanDate() != null ? DATE.format(v.getPlanDate()) : "");
                    o.put("eventDate", v.getEventDate() != null ? DATE.format(v.getEventDate()) : "");
                    o.put("deviationStatus", Validator.isNotNull(v.getDeviationStatus()) ? v.getDeviationStatus() : "");
                    o.put("instanceLinkObj", Validator.isNotNull(v.getInstanceLinkObj()) ? v.getInstanceLinkObj() : "");
                    arr.put(o);
                }
                _log.info("arr: " + arr.toString());
                out.write(arr.toString());
                return false;
        	}
        	
        	//SubjectVisitDefinitions
        	if("subjectVisitDefinitions".equals(op)) {
        		long subjectId = ParamUtil.getLong(resourceRequest, "parameter");
        		List<SubjectVisitDefinition> subjectVisitDefinitonList = SubjectVisitDefinitionLocalServiceUtil.getBySubjectId(subjectId);
        		JSONArray arr = JSONFactoryUtil.createJSONArray();
                for (SubjectVisitDefinition svd : subjectVisitDefinitonList) {
                    JSONObject o = JSONFactoryUtil.createJSONObject();
                    o.put("subjectVisitDefinitionId", svd.getSubjectVisitDefinitionId());
                    o.put("companyId", svd.getCompanyId());
                    o.put("groupId", svd.getGroupId());
                    o.put("projectId", svd.getProjectId());
                    o.put("visitGroupId", svd.getVisitGroupId());
                    o.put("subjectId", svd.getSubjectId());
                    o.put("userId", svd.getUserId());
                    o.put("userName", Validator.isNotNull(svd.getUserName()) ? svd.getUserName() : "");
                    o.put("createDate", svd.getCreateDate() != null ? DATE.format(svd.getCreateDate()) : "");
                    o.put("modifiedDate", svd.getModifiedDate() != null ? DATE.format(svd.getModifiedDate()) : "");
                    o.put("status", svd.getStatus());
                    o.put("statusByUserId", svd.getStatusByUserId());
                    o.put("statusByUserName", Validator.isNotNull(svd.getStatusByUserName()) ? svd.getStatusByUserName() : "");
                    o.put("statusDate", svd.getStatusDate() != null ? DATE.format(svd.getStatusDate()) : "");
                    o.put("parentCode", Validator.isNotNull(svd.getParentCode()) ? svd.getParentCode() : "");
                    o.put("visitDefinitionCode", Validator.isNotNull(svd.getVisitDefinitionCode()) ? svd.getVisitDefinitionCode() : "");
                    o.put("name", Validator.isNotNull(svd.getName()) ? svd.getName() : "");
                    o.put("order", svd.getOrder());
                    o.put("extCode", Validator.isNotNull(svd.getExtCode()) ? svd.getExtCode() : "");
                    o.put("anchorType", Validator.isNotNull(svd.getAnchorType()) ? svd.getAnchorType() : "");
                    o.put("offset", svd.getOffset());
                    o.put("windowMinus", svd.getWindowMinus());
                    o.put("windowPlus", svd.getWindowPlus());
                    o.put("type", svd.getType());
                    o.put("repeatCount", svd.getRepeatCount());
                    o.put("visitCRFId", svd.getVisitCRFId());
                    arr.put(o);
                }
                out.write(arr.toString());
                return false;
        	}
        	
        	//Institution
        	if("institution".equals(op)) {
        		long institutionId = ParamUtil.getLong(resourceRequest, "parameter");
        		Institution institution = InstitutionLocalServiceUtil.findByInstitutionId(institutionId);
        		JSONObject o = JSONFactoryUtil.createJSONObject();
        		o.put("institutionId", institution.getInstitutionId());
        		o.put("companyId", institution.getCompanyId());
                o.put("groupId", institution.getGroupId());
                o.put("projectId", institution.getProjectId());
                o.put("userId", institution.getUserId());
                o.put("userName", Validator.isNotNull(institution.getUserName()) ? institution.getUserName() : "");
                o.put("createDate", institution.getCreateDate() != null ? DATE.format(institution.getCreateDate()) : "");
                o.put("modifiedDate", institution.getModifiedDate() != null ? DATE.format(institution.getModifiedDate()) : "");
                o.put("status", institution.getStatus());
                o.put("statusByUserId", institution.getStatusByUserId());
                o.put("statusByUserName", Validator.isNotNull(institution.getStatusByUserName()) ? institution.getStatusByUserName() : "");
                o.put("statusDate", institution.getStatusDate() != null ? DATE.format(institution.getStatusDate()) : "");
                o.put("code", Validator.isNotNull(institution.getCode()) ? institution.getCode() : "");
                o.put("name", Validator.isNotNull(institution.getName()) ? institution.getName() : "");
                o.put("enName", Validator.isNotNull(institution.getEnName()) ? institution.getEnName() : "");
                o.put("type", institution.getType()); // Number
                o.put("piName", Validator.isNotNull(institution.getPiName()) ? institution.getPiName() : "");
                o.put("contactNum", Validator.isNotNull(institution.getContactNum()) ? institution.getContactNum() : "");
                o.put("email", Validator.isNotNull(institution.getEmail()) ? institution.getEmail() : "");
                o.put("irbDate", institution.getIrbDate() != null ? DATE.format(institution.getIrbDate()) : "");
                
        		out.write(o.toString());
                return false;
        	}
        	
        	//ExperimentalGroup
        	if("experimentalGroup".equals(op)) {
        		long experimentalGroupId = ParamUtil.getLong(resourceRequest, "parameter");
        		ExperimentalGroup experimentalGroup = ExperimentalGroupLocalServiceUtil.findByExperimentalGroupId(experimentalGroupId);
        		JSONObject o = JSONFactoryUtil.createJSONObject();
        		o.put("experimentalGroupId", experimentalGroup.getExperimentalGroupId());
        		o.put("companyId", experimentalGroup.getCompanyId());
                o.put("groupId", experimentalGroup.getGroupId());
                o.put("projectId", experimentalGroup.getProjectId());
                o.put("userId", experimentalGroup.getUserId());
                o.put("userName", Validator.isNotNull(experimentalGroup.getUserName()) ? experimentalGroup.getUserName() : "");
                o.put("createDate", experimentalGroup.getCreateDate() != null ? DATE.format(experimentalGroup.getCreateDate()) : "");
                o.put("modifiedDate", experimentalGroup.getModifiedDate() != null ? DATE.format(experimentalGroup.getModifiedDate()) : "");
                o.put("status", experimentalGroup.getStatus());
                o.put("statusByUserId", experimentalGroup.getStatusByUserId());
                o.put("statusByUserName", Validator.isNotNull(experimentalGroup.getStatusByUserName()) ? experimentalGroup.getStatusByUserName() : "");
                o.put("expCode", Validator.isNotNull(experimentalGroup.getExpCode()) ? experimentalGroup.getExpCode() : "");
                o.put("name", Validator.isNotNull(experimentalGroup.getName()) ? experimentalGroup.getName() : "");
                o.put("description", Validator.isNotNull(experimentalGroup.getDescription()) ? experimentalGroup.getDescription() : "");
                o.put("type", experimentalGroup.getType());
                
        		out.write(o.toString());
                return false;
        	}
        	
        	// QueryLink
        	if("queryLinks".equals(op)) {
        	    long instanceId = ParamUtil.getLong(resourceRequest, "parameter");
        	    List<QueryLink> queryLinkList = QueryLinkLocalServiceUtil.findByInstanceId(instanceId);
        	    
        	    JSONArray arr = JSONFactoryUtil.createJSONArray();
        	    
        	    for(QueryLink ql : queryLinkList) {
        	        JSONObject o = JSONFactoryUtil.createJSONObject();
        	        
        	        // ID 諛� 湲곕낯 �떇蹂꾩옄 (Numbers)
        	        o.put("queryId", ql.getQueryId());
        	        o.put("companyId", ql.getCompanyId());
        	        o.put("groupId", ql.getGroupId());
        	        o.put("projectId", ql.getProjectId());
        	        o.put("userId", ql.getUserId());
        	        o.put("userName", Validator.isNotNull(ql.getUserName()) ? ql.getUserName() : "");
        	        o.put("createDate", ql.getCreateDate() != null ? DATE.format(ql.getCreateDate()) : "");
        	        o.put("modifiedDate", ql.getModifiedDate() != null ? DATE.format(ql.getModifiedDate()) : "");
        	        o.put("subjectId", ql.getSubjectId());
        	        o.put("visitGroupId", ql.getVisitGroupId());
        	        o.put("visitDefinitionId", ql.getVisitDefinitionId());
        	        o.put("visitCRFId", ql.getVisitCRFId());
        	        o.put("subCRFId", ql.getSubCRFId());
        	        o.put("instanceId", ql.getInstanceId());
        	        o.put("itemCode", Validator.isNotNull(ql.getItemCode()) ? ql.getItemCode() : ""); 
        	        o.put("sourceType", Validator.isNotNull(ql.getSourceType()) ? ql.getSourceType() : "");
        	        o.put("ruleId", ql.getRuleId());
        	        o.put("ruleInfo", Validator.isNotNull(ql.getRuleInfo()) ? ql.getRuleInfo() : "");
        	        arr.put(o);
        	    }
        	    
        	    out.write(arr.toString()); 
        	    return false;
        	}
        	
        	//QueryLinkInfo
        	if("queryLinkInfo".equals(op)) {
        		String jsonString = ParamUtil.getString(resourceRequest, "parameter");
        		_log.info("queryLinkInfo JSON: " + jsonString);
        		List<Long> linkIdList = new ArrayList<>();
        		boolean hasQuery = false;
        		int queryCount= 0;
        		try {
        			JSONObject instanceLinkObj = JSONFactoryUtil.createJSONObject(jsonString);
        			JSONArray linksArray = instanceLinkObj.getJSONArray("links");
        			if (linksArray != null) {
        	            for (int i = 0; i < linksArray.length(); i++) {
        	                
        	                linkIdList.add(linksArray.getLong(i)); 
        	            }
        	        }
        		} catch (Exception e) {
        			e.printStackTrace();
        		}
        		for(Long id : linkIdList) {
        			List<QueryLink> queryLinkList = QueryLinkLocalServiceUtil.findByInstanceId(id);
        			if(!queryLinkList.isEmpty()) { hasQuery = true; queryCount++; }
        		}
        		JSONObject o = JSONFactoryUtil.createJSONObject();
        		o.put("hasQuery", hasQuery);
        		o.put("queryCount", queryCount);
        		
        		_log.info("queryLinkInfo OutPut: " + o.toString());
        		
        		out.write(o.toString());
        		return false;
        	}
        	
        	//VisitCRFId
        	if("visitCRFFind".equals(op)) {
        		long dataSetId = ParamUtil.getLong(resourceRequest, "parameter");
        		List<SetTypeLink> typeLinkList = SetTypeLinkLocalServiceUtil.getSetTypeLinkListBySet(dataSetId);
        		List<Long> dataTypeList = new ArrayList<>(); //DataTypeId
        		for(SetTypeLink s : typeLinkList) {
        			dataTypeList.add(s.getDataTypeId());
        		}
        		//long dataCollectionId = CollectionSetLinkLocalServiceUtil.getCollectionSetLinkListBySet(dataSetId) 
        		
        		List<Long> dataStructureList = new ArrayList<>(); //DataStructureId
        		for(long t : dataTypeList) {
        			dataStructureList.add(TypeStructureLinkLocalServiceUtil.getTypeStructureLink(t).getDataStructureId());
        		}
        	}
        	
        	//SaveVisit
        	if("saveVisit".equals(op)) {
        		long visitEventId = ParamUtil.getLong(resourceRequest, "visitEventId");
        		_log.info("visitEventId:" + visitEventId );
        		Date eventDate = ParamUtil.getDate(resourceRequest, "eventDate", DATE);
        		_log.info("eventDate:" + eventDate );
        		VisitEventLocalServiceUtil.updateEventDate(visitEventId, eventDate, "");
        		
        		
        	    
        	    JSONObject o = JSONFactoryUtil.createJSONObject();
        	    o.put("ok", true);
        	    o.put("visitEventId", visitEventId);

        	    out.write(o.toString());
        	    return false;
        	}
        	
        	//DeleteVisit
        	if("deleteVisit".equals(op)) {
        		long visitEventId = ParamUtil.getLong(resourceRequest, "visitEventId");
        		Date eventDate = null;
        		VisitEventLocalServiceUtil.updateEventDate(visitEventId, eventDate, "");
        		VisitEvent v = VisitEventLocalServiceUtil.getVisitEvent(visitEventId);
        		if (!v.getInstanceLinkObj().isEmpty()) {
        			//instanceLink瑜� -> links -> Delete queryLink
        		}
        		
        	}
        	
            // unsupported
            JSONObject err = JSONFactoryUtil.createJSONObject();
            err.put("ok", false);
            err.put("error", "unsupported_op");
            out.write(err.toString());
            _log.warn("unsupported op: " + op);
            return false;
        	
        	
        } catch (Exception e) {
            _log.error("serveResource error", e);
            try {
                JSONObject err = JSONFactoryUtil.createJSONObject();
                err.put("ok", false);
                err.put("error", "exception");
                err.put("message", e.getMessage());
                resourceResponse.getWriter().write(err.toString());
            } catch (Exception ignore) {}
            return false;
        }
        
	}

}
