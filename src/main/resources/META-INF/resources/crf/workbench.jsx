import React, { createRef } from "react";
import Button, { ClayButtonWithIcon } from "@clayui/button";
import Panel from "@clayui/panel";
import { Rnd } from "react-rnd";
import { Util } from "./util";
import { Event, LoadingStatus, ResourceIds, WindowState } from "./station-x";

export class Workbench {
	static loadWorkingPortlet({ portletSectionId, windowState, workingPortlet, workbench }) {
		//console.log("Workbench.loadWorkingPortlet: ", workingPortlet);

		AUI().use("aui-base, portlet-url", function (A) {
			let portletURL = Liferay.PortletURL.createURL(workingPortlet.url);

			portletURL.setWindowState(windowState ?? WindowState.EXCLUSIVE);

			portletURL.setParameter("workbenchId", workbench.portletId);

			for (const paramKey in workingPortlet.params) {
				portletURL.setParameter(paramKey, workingPortlet.params[paramKey]);
			}

			//console.log("Load working portlet: ", portletURL.toString());

			$.ajax({
				url: portletURL.toString(),
				type: "get",
				dataType: "html",
				success: (html) => {
					$("#" + portletSectionId).html(html);
				},
				error: (a) => {
					console.log(a);
				}
			});
		});
	}

	static BASE_WINDOW_ZINDEX = 10000;

	static WorkflowStatus = {
		ANY: -1,
		APPROVED: 0,
		DENIED: 1,
		DRAFT: 2,
		EXPIRED: 3,
		IN_TRASH: 4,
		INACTIVE: 5,
		INCOMPLETE: 6,
		PENDING: 7,
		SCHEDULED: 8
	};

	static WindowState = {
		MINIMIZE: 0,
		NORMAL: 1,
		MAXIMIZE: 2
	};

	static PortletState = {
		NORMAL: 0,
		MODAL: 1,
		POPUP: 2,
		BLANK: 3
	};

	static RequestIDs = {
		addComment: "addComment",
		addDataType: "addDataType",
		checkDataTypeUnique: "checkDataTypeUnique",
		checkDataStructureUnique: "checkDataStructureUnique",
		checkDataStructureCodeUnique: "checkDataStructureCodeUnique",
		deleteComment: "deleteComment",
		deleteDataTypes: "deleteDataTypes",
		deleteDataCollections: "deleteDataCollections",
		deleteDataSets: "deleteDataSets",
		deleteDataStructures: "deleteDataStructures",
		deleteTypeStructureLink: "deleteTypeStructureLink",
		deleteTypeStructureLinkAndImportDataStructure: "deleteTypeStructureLinkAndImportDataStructure",
		importDataType: "importDataType",
		importDataStructure: "importDataStructure",
		loadDataCollection: "loadDataCollection",
		loadDataSet: "loadDataSet",
		loadDataSetList: "loadDataSetList",
		loadDataStructure: "loadDataStructure",
		loadDataStructureWithInfo: "loadDataStructureWithInfo",
		loadDataType: "loadDataType",
		loadStructuredData: "loadStructuredData",
		removeLinkInfoAndRedirectToBuilder: "removeLinkInfoAndRedirectToBuilder",
		saveDataCollection: "saveDataCollection",
		saveDataSet: "saveDataSet",
		saveDataStructure: "saveDataStructure",
		saveParameter: "saveParameter",
		saveStructuredData: "saveStructuredData",
		saveTypeStructureLink: "saveTypeStructureLink",
		saveLinkInfoAndRedirectToBuilder: "saveLinkInfoAndRedirectToBuilder",
		searchDataCollections: "searchDataCollections",
		searchDataSets: "searchDataSets",
		searchDataStructures: "searchDataStructures",
		searchDataTypes: "searchDataTypes",
		searchParameters: "searchParameters",
		searchStructuredData: "searchStructuredData",
		updateDataType: "updateDataType"
	};

	namespace = "";
	windows = {};
	portlets = {};
	workbenchId = "";
	baseResourceURL = "";
	baseRenderURL = "";

	constructor({ namespace, workbenchId, baseRenderURL, baseResourceURL, spritemap }) {
		this.namespace = namespace;
		this.workbenchId = workbenchId ?? "";
		this.baseResourceURL = baseResourceURL;
		this.baseRenderURL = baseRenderURL;
		this.spritemap = spritemap;
	}

	get windowCount() {
		return Object.keys(this.windows).length;
	}

	get portletCount() {
		return Object.keys(this.portlets).length;
	}

	get topWindow() {
		return this.windows[this.windows.length - 1];
	}

	get zIndex() {
		return Workbench.BASE_WINDOW_ZINDEX + this.windowCount - 1;
	}

	get increasedWindowId() {
		let increased = 0;
		Object.values(this.windows).forEach((value) => {
			increased = value.windowId >= increased ? value.windowId : increased;
		});

		return increased + 1;
	}

	get windowContentArray() {
		return Object.values(this.windows).map((value) => value.windowContent);
	}

	addWindow = (portletId, windowContent, windowState) => {
		this.windows[portletId] = {
			windowId: this.increasedWindowId,
			windowContent: windowContent,
			windowState: windowState
		};

		return Object.keys(this.windows).length;
	};

	removePortlet(portletId) {
		delete this.portlets[portletId];
	}

	addPortlet = (portletId, portletContent) => {
		this.portlets[portletId] = portletContent;

		return Object.keys(this.portlets).length;
	};

	setWindowState(portletId, windowState) {
		this.windows[portletId].windowState = windowState;
	}

	getWindowState(portletId) {
		return this.windows[portletId].windowState;
	}

	getWindowId(portletId) {
		return this.windows[portletId].windowId;
	}

	removeWindow(portletId) {
		delete this.windows[portletId];
	}

	loadPortlet = async ({ portletName, params = {}, title = "" }) => {
		const portletInstance = await this.createPortletInfo({
			resourceId: ResourceIds.CREATE_PORTLET_INSTANCE,
			portletName: portletName
		});

		portletInstance.title = title;
		//console.log("Workbench loadPortlet: ", portletInstance);

		params.workbenchNamespace = this.namespace;
		params.workbenchId = this.workbenchId;

		let renderURL = await this.createRenderURL({
			baseRenderURL: portletInstance.url,
			portletParams: {
				portletId: portletInstance.portletId,
				title: title,
				windowState: WindowState.EXCLUSIVE
			},
			dataParams: params
		});

		const portletContent = await this.ajax({
			url: renderURL,
			type: "get",
			dataType: "html"
		});

		//const portletRoot = createRoot(portletRootTag);

		return {
			portletName: portletName,
			portletId: portletInstance.portletId,
			namespace: portletInstance.namespace,
			displayName: portletInstance.displayName,
			title: title,
			content: portletContent,
			portlet: (
				<SXPortlet
					key={portletInstance.namespace}
					namespace={this.namespace}
					portletNamespace={portletInstance.namespace}
					portletContent={portletInstance.content}
				/>
			)
		};
	};

	getWindowMap() {
		return Object.values(this.windows).map((win) => win.windowContent);
	}

	openPortletWindow = async ({ portletName, windowTitle, params }) => {
		let portletInstance = await this.createPortletInfo({
			resourceId: ResourceIds.CREATE_PORTLET_INSTANCE,
			portletName: portletName
		});

		params.workbenchNamespace = this.namespace;
		params.workbenchId = this.workbenchId;

		let renderURL = await this.createRenderURL({
			baseRenderURL: portletInstance.url,
			portletParams: {
				portletId: portletInstance.portletId,
				windowState: WindowState.EXCLUSIVE
			},
			dataParams: params
		});

		let portletContent = await this.ajax({ url: renderURL, type: "get", dataType: "html" });

		return this.addWindow(
			portletInstance.portletId,
			<SXPortletWindow
				key={portletInstance.portletId}
				portletNamespace={portletInstance.namespace}
				portletId={portletInstance.portletId}
				workbenchNamespace={this.namespace}
				workbenchId={this.workbenchId}
				title={windowTitle}
				content={portletContent}
				windowId={this.increasedWindowId}
				spritemap={this.spritemap}
			/>,
			Workbench.WindowState.NORMAL
		);

		/*
		return (
			<SXPortletWindow
				portletNamespace={portletInstance.namespace}
				portletId={portletInstance.portletId}
				workbenchNamespace={this.namespace}
				workbenchId={this.workbenchId}
				title={title}
				content={portletContent}
				windowId={this.increasedWindowId}
				spritemap={this.spritemap}
			/>
		);
		*/
	};

	createPortletInfo = async ({ resourceId, portletName }) => {
		let url = await this.createResourceURL({
			resourceId: resourceId
		});

		//console.log("Workbench URL: ", url);

		const dataParams = Util.toNamespacedParams(this.namespace, {
			portletName: portletName
		});

		const portletInfo = await this.ajax({
			url: url,
			params: dataParams
		});

		return portletInfo;
	};

	createResourceURL = async ({ resourceId }) => {
		return new Promise((resolve, reject) => {
			AUI().use("aui-base, portlet-url", (A) => {
				try {
					let resourceURL = Liferay.PortletURL.createURL(this.baseResourceURL);
					resourceURL.setResourceId(resourceId);
					resourceURL.setPortletId(this.workbenchId);

					resolve(resourceURL.toString());
				} catch (error) {
					reject(error);
				}
			});
		});
	};

	createRenderURL = async ({ baseRenderURL, portletParams, dataParams }) => {
		return new Promise((resolve, reject) => {
			AUI().use("aui-base, portlet-url", function (A) {
				try {
					let renderURL = Liferay.PortletURL.createURL(baseRenderURL);
					for (const portletParam in portletParams) {
						switch (portletParam) {
							case "portletId":
								renderURL.setPortletId(portletParams[portletParam]);
								break;
							case "windowState":
								renderURL.setWindowState(portletParams[portletParam]);
								break;
							case "lifecycle":
								renderURL.setLifecycle(portletParams[portletParam]);
								break;
							case "doAsGroupId":
								renderURL.setDoAsGroupId(portletParams[portletParam]);
								break;
							case "doAsUserId":
								renderURL.setDoAsUserId(portletParams[portletParam]);
								break;
							case "escapeXML":
								renderURL.setEscapeXML(portletParams[portletParam]);
								break;
							case "plid":
								renderURL.setPlid(portletParams[portletParam]);
								break;
							case "portletMode":
								renderURL.setPortletMode(portletParams[portletParam]);
								break;
						}
					}

					//const namespacedParams = Util.toNamespacedParams(namespace, dataParams);
					renderURL.setParameters(dataParams);

					resolve(renderURL.toString());
				} catch (error) {
					reject(error);
				}
			});
		});
	};

	ajax = async ({ url, params = {}, type = "post", dataType = "json" }) => {
		//console.log("Workbench ajax URL: ", url, type, dataType);
		let result;

		let data;
		if (type === "post") {
			const formData = new FormData();
			Object.keys(params).forEach((key) => {
				formData.append(this.namespace + key, params[key]);
				//console.log(this.namespace + key + ": " + params[key]);
			});

			return new Promise((resolve, reject) => {
				try {
					$.ajax({
						url: url,
						type: type,
						data: formData,
						processData: false,
						contentType: false,
						success: (result) => {
							//console.log("Data Ajax finished: ", typeof result, result);
							resolve(JSON.parse(result));
						}
					});
				} catch (error) {
					reject(error);
				}
			});
		} else {
			//console.log("Ajax get: ", url, params);
			return new Promise((resolve, reject) => {
				try {
					$.ajax({
						url: url,
						type: type,
						dataType: dataType,
						success: (result) => {
							resolve(result);
						}
					});
				} catch (error) {
					reject(error);
				}
			});
		}
	};

	fetch = async ({ url, method = "post", contentType = "application/json", formData }) => {
		try {
			const response = await fetch(url, {
				method: method,
				headers: {
					"Content-Type": contentType
				},
				body: formData
			});

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const result = await response.json();
			//console.log(result);
		} catch (error) {
			console.error("Fetch error:", error);
		}
	};

	processRequest = async ({ requestPortlet, sourceFormId, requestId, params }) => {
		let resourceId;

		switch (requestId) {
			case Workbench.RequestIDs.addComment: {
				//console.log("[processRequest] addComment", requestPortlet, sourceFormId, requestId, params);
				resourceId = ResourceIds.ADD_COMMENT;

				const user = SXSystem.getUser();
				const result = {
					id: 123456,
					...user,
					comment: params.comment,
					parentId: params.parentId,
					date: new Date().toLocaleString(),
					replies: []
				};

				this.fireResponse({
					targetPortlet: requestPortlet,
					targetFormId: sourceFormId,
					requestId: requestId,
					params: params,
					data: result
				});

				return;
			}
			case Workbench.RequestIDs.deleteComment: {
				resourceId = ResourceIds.DELETE_COMMENT;

				this.fireResponse({
					targetPortlet: requestPortlet,
					targetFormId: sourceFormId,
					requestId: requestId,
					params: params,
					data: {
						id: params.commentId
					}
				});
				return;
			}
			case Workbench.RequestIDs.addDataType: {
				resourceId = ResourceIds.ADD_DATATYPE;
				break;
			}
			case Workbench.RequestIDs.checkDataTypeUnique: {
				resourceId = ResourceIds.CHECK_DATATYPE_UNIQUE;
				break;
			}
			case Workbench.RequestIDs.checkDataStructureUnique:
			case Workbench.RequestIDs.checkDataStructureCodeUnique: {
				resourceId = ResourceIds.CHECK_DATASTRUCTURE_UNIQUE;
				break;
			}
			case Workbench.RequestIDs.deleteDataTypes: {
				resourceId = ResourceIds.DELETE_DATATYPES;
				break;
			}
			case Workbench.RequestIDs.deleteTypeStructureLink:
			case Workbench.RequestIDs.removeLinkInfoAndRedirectToBuilder:
			case Workbench.RequestIDs.deleteTypeStructureLinkAndImportDataStructure: {
				resourceId = ResourceIds.DELETE_TYPE_STRUCTURE_LINK;
				break;
			}
			case Workbench.RequestIDs.importDataType:
			case Workbench.RequestIDs.loadDataType: {
				resourceId = ResourceIds.LOAD_DATATYPE;
				break;
			}
			case Workbench.RequestIDs.importDataStructure:
			case Workbench.RequestIDs.loadDataStructureWithInfo:
			case Workbench.RequestIDs.loadDataStructure: {
				resourceId = ResourceIds.LOAD_DATASTRUCTURE;
				break;
			}
			case Workbench.RequestIDs.saveLinkInfoAndRedirectToBuilder:
			case Workbench.RequestIDs.saveTypeStructureLink: {
				resourceId = ResourceIds.SAVE_TYPE_STRUCTURE_LINK;
				break;
			}
			case Workbench.RequestIDs.searchDataTypes: {
				resourceId = ResourceIds.SEARCH_DATATYPES;
				break;
			}
			case Workbench.RequestIDs.updateDataType: {
				resourceId = ResourceIds.UPDATE_DATATYPE;
				break;
			}
			case Workbench.RequestIDs.loadDataCollection: {
				resourceId = ResourceIds.LOAD_DATACOLLECTION;
				break;
			}
			case Workbench.RequestIDs.saveDataCollection: {
				resourceId = ResourceIds.SAVE_DATACOLLECTION;
				break;
			}
			case Workbench.RequestIDs.deleteDataCollections: {
				resourceId = ResourceIds.DELETE_DATACOLLECTIONS;
				break;
			}
			case Workbench.RequestIDs.saveDataStructure: {
				resourceId = ResourceIds.SAVE_DATASTRUCTURE;
				break;
			}
			case Workbench.RequestIDs.loadStructuredData: {
				resourceId = ResourceIds.LOAD_STRUCTURED_DATA_EDITING;
				break;
			}
			case Workbench.RequestIDs.searchDataCollections: {
				resourceId = ResourceIds.SEARCH_DATACOLLECTIONS;
				break;
			}
			case Workbench.RequestIDs.searchDataSets: {
				resourceId = ResourceIds.SEARCH_DATASETS;
				break;
			}
			case Workbench.RequestIDs.loadDataSet: {
				resourceId = ResourceIds.LOAD_DATASET;
				break;
			}
			case Workbench.RequestIDs.saveDataSet: {
				resourceId = ResourceIds.SAVE_DATASET;
				break;
			}
			case Workbench.RequestIDs.deleteDataSets: {
				resourceId = ResourceIds.DELETE_DATASETS;
				break;
			}
			case Workbench.RequestIDs.deleteDataStructures: {
				resourceId = ResourceIds.DELETE_DATASTRUCTURES;
				break;
			}
			case Workbench.RequestIDs.searchDataStructures: {
				resourceId = ResourceIds.SEARCH_DATASTRUCTURES;
				break;
			}
		}

		let result = {};
		if (Util.isNotEmpty(resourceId)) {
			const url = await this.createResourceURL({ resourceId: resourceId });

			result = await this.ajax({
				url: url,
				params: params
			});
		}

		this.fireResponse({
			targetPortlet: requestPortlet,
			targetFormId: sourceFormId,
			requestId: requestId,
			params: params,
			data: result
		});

		return LoadingStatus.COMPLETE;
	};

	fireLoadData = ({ targetPortlet, requestId, params, data }) => {
		Event.fire(Event.SX_LOAD_DATA, this.namespace, targetPortlet, {
			data: data,
			requestId: requestId,
			params: params,
			status: data instanceof Promise ? LoadingStatus.FAIL : LoadingStatus.COMPLETE
		});
	};

	fireResponse = ({ targetPortlet, targetFormId, requestId, params, data }) => {
		//console.log("[Workbench fireResponse] ", targetPortlet, targetFormId, requestId, params, data);
		Event.fire(Event.SX_RESPONSE, this.namespace, targetPortlet, {
			targetFormId: targetFormId,
			requestId: requestId,
			data: data,
			params: params,
			status: data instanceof Promise ? LoadingStatus.FAIL : LoadingStatus.COMPLETE
		});
	};

	fireComponentWillUnmount = ({ targetPortlet }) => {
		Event.fire(Event.SX_COMPONENT_WILL_UNMOUNT, this.namespace, targetPortlet, {});
	};
}

export class SXPortletWindow extends React.Component {
	constructor(props) {
		super(props);

		this.portletNamespace = props.portletNamespace;
		this.portletId = props.portletId;
		this.workbenchNamespace = props.workbenchNamespace;
		this.workbenchId = props.workbenchId;

		this.title = props.title;
		this.content = props.content;
		this.standAlone = props.standAlone ?? false;
		this.windowId = props.windowId ?? 0;
		this.spritemap = props.spritemap;
		this.zIndex = Workbench.BASE_WINDOW_ZINDEX + this.windowId;

		this.portletContentRef = createRef();

		this.portletBody = this.namespace + this.windowId;

		const width = props.width ?? 800;
		const height = props.height ?? 800;

		this.state = {
			startX: window.innerWidth / 2 - width / 2,
			startY: window.innerHeight / 2 - height / 2,
			width: width,
			height: height
		};

		this.focusRef = createRef();
	}

	componentDidMount() {
		//$(this.portletContentRef.current).html(this.content ?? "<div></div>");
		Util.html(this.portletContentRef.current, this.content ?? "<div></div>");
		//$("#" + this.portletBody).html(this.content);
		//Util.html(this.portletBody, this.content);
	}

	componentWillUnmount() {
		console.log("SXPortletWindow will unmount");

		Event.fire(Event.SX_COMPONENT_WILL_UNMOUNT, this.namespace, this.portletNamespace, {
			targetPortlet: this.portletNamespace
		});
	}

	handleClick = (e) => {
		e.stopPropagation();

		Event.fire(Event.SX_WINDOW_SELECTED, this.portletNamespace, this.workbenchNamespace, {
			targetFormId: this.workbenchId,
			windowId: this.portletId
		});
	};

	render() {
		console.log("[Window render] ", window);
		return (
			<Rnd
				default={{
					x: (window.scrollX + window.innerWidth) / 2 - this.state.width / 2,
					y: (window.scrollY + window.innerHeight) / 2 - this.state.height / 2,
					width: this.state.width,
					height: this.state.height
				}}
				dragHandleClassName="clay-panel-header"
				style={{
					zIndex: this.zIndex
				}}
				onResizeStop={(e, direction, ref, delta, newPosition) => {
					console.log("[SXPortletWindow newPosition] ", e, direction, delta, newPosition);
					this.setState({
						width: ref.offsetWidth,
						height: ref.offsetHeight
					});
				}}
				onClick={this.handleClick}
			>
				<Panel
					displayType="secondary"
					style={{
						width: "100%",
						height: "100%",
						backgroundColor: "#fff",
						borderWidth: "3px 3px 3px 3px",
						borderRadius: "0.5rem",
						boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.2)",
						overflow: "hidden"
					}}
				>
					<Panel.Header
						className="clay-panel-header"
						style={{
							backgroundColor: "#9ed8f9ff",
							padding: "0px 5px",
							borderRadius: "0.5rem 0.5rem 0 0"
						}}
					>
						<div
							className="autofit-row autofit-padded"
							ref={this.focusRef}
						>
							<div className="autofit-col autofit-col-expand">
								<span style={{ fontSize: "1.0rem", fontWeight: "800" }}>{this.title}</span>
							</div>
							<div className="autofit-col">
								<Button.Group>
									{/*
									<ClayButtonWithIcon
										aria-label={Util.translate("minimize-window")}
										symbol="hr"
										size="sm"
										displayType="translucent"
										style={{
											borderRadius: "50%"
										}}
										onClick={(e) => {
											e.stopPropagation();

											Event.fire(Event.SX_MINIMIZE_WINDOW, this.namespace, this.namespace, {
												targetFormId: this.workbenchId,
												windowId: this.windowId
											});
										}}
										spritemap={this.spritemap}
									/>
									<ClayButtonWithIcon
										aria-label={Util.translate("full-screen")}
										symbol="rectangle"
										size="sm"
										displayType="translucent"
										style={{
											borderRadius: "50%"
										}}
										onClick={(e) => {
											e.stopPropagation();

											Event.fire(Event.SX_MAXIMIZE_WINDOW, this.namespace, this.namespace, {
												targetFormId: this.workbenchId,
												windowId: this.windowId
											});
										}}
										spritemap={this.spritemap}
									/>
									*/}
									<ClayButtonWithIcon
										aria-label={Util.translate("close-window")}
										symbol="times"
										size="sm"
										displayType="translucent"
										style={{
											borderRadius: "50%"
										}}
										onClick={(e) => {
											e.stopPropagation();

											Event.fire(
												Event.SX_REMOVE_WINDOW,
												this.portletNamespace,
												this.workbenchNamespace,
												{
													targetFormId: this.workbenchId,
													portletId: this.portletId
												}
											);
										}}
										spritemap={this.spritemap}
									/>
								</Button.Group>
							</div>
						</div>
					</Panel.Header>
					<Panel.Body>
						<div
							ref={this.portletContentRef}
							style={{
								display: "block",
								height: this.state.height - 40 + "px",
								overflowX: "hidden",
								overflowY: "auto",
								paddingBottom: "2rem"
							}}
						></div>
						<div style={{ paddingTop: "2rem" }}></div>
					</Panel.Body>
				</Panel>
			</Rnd>
		);
	}
}

export class SXPortlet extends React.Component {
	constructor(props) {
		super(props);

		this.namespace = props.namespace;
		this.portletContent = props.portletContent;
		this.portletNamespace = props.portletNamespace;

		this.portletRootRef = createRef();
	}

	componentDidMount() {
		if (this.portletRootRef.current) {
			Util.html(this.portletRootRef.current, this.portletContent);
			this.forceUpdate();
		}
	}

	componentWillUnmount() {
		//console.log("SXPortlet will unmount");

		Event.fire(Event.SX_COMPONENT_WILL_UNMOUNT, this.namespace, this.portletNamespace, {
			targetPortlet: this.portletNamespace
		});
	}

	render() {
		return <div ref={this.portletRootRef}></div>;
	}
}
