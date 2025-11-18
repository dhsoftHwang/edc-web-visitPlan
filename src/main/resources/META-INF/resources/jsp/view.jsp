<%@ include file="/init.jsp" %>

<%
    String workingPortletName = ParamUtil.getString(
            renderRequest, 
            "workingPortletName",
            EdcVisitWebPortletKeys.EdcVisitWeb);
    String workingPortletId = PortletIdCodec.encode(workingPortletName);
    String workingPortletNamespace = "_" + workingPortletId + "_";
    
    String workingPortletParams = ParamUtil.getString(renderRequest, "workingPortletParams", "{}");
    
    String portalURL = PortalUtil.getPortalURL(renderRequest);
%>

<portlet:renderURL  var="baseRenderURL">
</portlet:renderURL>

<portlet:actionURL  var="baseActionURL">
</portlet:actionURL>

<portlet:resourceURL  var="baseResourceURL">
</portlet:resourceURL>

<liferay-portlet:renderURL portletName="<%=workingPortletName%>" var="workingPortletURL"  windowState="<%=LiferayWindowState.EXCLUSIVE.toString()%>">
</liferay-portlet:renderURL>

<div id="<portlet:namespace />-root"></div>

<script>
    // using initial portlet info when start portlet
    window.EDCPortletInfo = {
        rootElement: '<portlet:namespace />-root',
        portletId: '<%=EdcVisitWebPortletKeys.EdcVisitWeb%>',
        portletParams:{
            namespace: '<portlet:namespace/>',
            groupId: themeDisplay.getScopeGroupId(),
            userId: themeDisplay.getUserId(),
            dafaultLanguageId: '<%= defaultLocale.toLanguageTag() %>',
            currentLanguageId: '<%= locale.toLanguageTag() %>',
            availableLanguageIds: '<%= String.join( ",", locales.toArray(new String[0]) ) %>', 
            portalURL: '<%= portalURL %>', 
            contextPath: '<%= contextPath %>',
            spritemapPath: '<%= contextPath %>/asset/images/icons.svg',
            portletId: '<%= portletDisplay.getId() %>',
            imagePath: '<%= contextPath %>/asset/images/',
            plid: '<%= themeDisplay.getPlid() %>',
            baseRenderURL: '<%= baseRenderURL %>',
            baseActionURL: '<%= baseActionURL %>',
            baseResourceURL: '<%= baseResourceURL %>',
            redirectURLs: {
                backURL: '<%= currentURL %>',
            },
            workbench:{
                url: '<%= baseRenderURL%>',
                namespace: '<portlet:namespace/>',
                portletId: '<%= portletDisplay.getId() %>',
            },
            workingPortlet:{
                portletId: '<%= workingPortletId %>',
                portletName: '<%= workingPortletName %>',
                namespace: '<%= workingPortletNamespace %>',
                url: '<%= workingPortletURL %>',
                params: JSON.parse('<%= workingPortletParams %>')
            },

            // ResourceCommand URL
            
        }
    };

    console.log(window.EDCPortletInfo);

    // using dynamic-include station-x-system.js
    // reload script
    SXSystem.loadStartPortletModuleScript("<%= request.getContextPath() %>/lib/start.js");
</script>