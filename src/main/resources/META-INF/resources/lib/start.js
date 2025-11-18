import { view } from "./index.js";

function startPortlet() {
	if(window.EDCPortletInfo) {
		view(window.EDCPortletInfo.rootElement, window.EDCPortletInfo.portletParams);
	} else {
		console.log("Waiting working portlet Info...");
		setTimeout(startPortlet, 200);
	}
	
}

startPortlet();