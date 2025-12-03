import React from "react";

export const Util = {
	isEqual: (obj1, obj2) => {
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		if (keys1.length !== keys2.length) return false;

		return keys1.every((key) => obj2.hasOwnProperty(key) && obj1[key] === obj2[key]);
	},

	deepEqual: (obj1, obj2) => {
		if (obj1 == obj2) {
			return true;
		}
		if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 == null || obj2 == null) {
			return false;
		}
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);
		if (keys1.length !== keys2.length) {
			return false;
		}
		for (let key of keys1) {
			if (!keys2.includes(key)) {
				return false;
			}
			if (!Util.deepEqual(obj1[key], obj2[key])) {
				return false;
			}
		}
		return true;
	},

	toNamespacedParams: (namespace, params) => {
		return Util.wrapObjectKeys(namespace, null, params);
	},

	wrapObjectKeys: (prefix, postfix, params) => {
		return Object.fromEntries(
			Object.entries(params).map(([key, value]) => {
				if (!prefix && postfix) {
					return [`${key}${postfix}`, value];
				} else if (prefix && !postfix) {
					return [`${prefix}${key}`, value];
				} else if (prefix && postfix) {
					return [`${prefix}${key}${postfix}`, value];
				} else {
					return [`${key}`, value];
				}
			})
		);
	},

	deepCopy: (obj) => {
		if (obj == null || typeof obj !== "object") {
			return obj;
		}
		if (Array.isArray(obj)) {
			return obj.map(deepCopy);
		}
		const copiedObj = {};
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				copiedObj[key] = Util.deepCopy(obj[key]);
			}
		}

		return copiedObj;
	},

	isNotEmpty: (obj) => {
		return !Util.isEmptyObject(obj);
	},

	isEmpty: function (obj) {
		return Util.isEmptyObject(obj);
	},

	isEmptyObject: function (obj) {
		if (obj == null || obj == undefined) {
			return true;
		}

		if (typeof obj == "boolean" || typeof obj == "number" || (typeof obj == "string" && obj)) {
			return false;
		}

		if (Array.isArray(obj) && obj.length > 0) {
			return obj.every(Util.isEmpty);
		}

		if (typeof obj == "object" && Object.keys(obj).length > 0) {
			return Object.values(obj).every(Util.isEmpty);
		}

		return true;
	},

	namespace: (namespace, param) => {
		return namespace + param;
	},

	createRenderURL: async function ({ baseRenderURL, portletParams, dataParams }) {
		let url;
		await AUI().use("aui-base, portlet-url", function (A) {
			let renderURL = Liferay.PortletURL.createRenderURL(baseRenderURL);
			const { namespace } = portletParams;
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

			const namespacedParams = Util.toNamespacedParams(namespace, dataParams);
			renderURL.setParameters(namespacedParams);

			url = renderURL.toString();
			console.log("renderURL: ", renderURL.toString());
		});

		return url;
	},

	redirectTo: (baseRenderURL, portletParams, dataParams) => {
		Util.createRenderURL({
			baseRenderURL: baseRenderURL,
			portletParams: portletParams,
			dataParams: dataParams
		})
			.then((url) => {
				window.location.href = url;
			})
			.catch((err) => errorFunc(err));
	},

	createResourceURL: async function ({ portletId, baseResourceURL, resourceId }) {
		let url = "";

		await AUI().use("aui-base, portlet-url", (A) => {
			let resourceURL = Liferay.PortletURL.createURL(baseResourceURL);
			resourceURL.setResourceId(resourceId);
			resourceURL.setPortletId(portletId);

			url = resourceURL.toString();
		});

		console.log("Util.createResourceURL: ", url);

		return url;
	},

	createPortletURL: async function ({ workbenchId, baseResourceURL, resourceId, portletName }) {
		let url = await Util.createResourceURL({
			portletId: workbenchId,
			baseResourceURL: baseResourceURL,
			resourceId: resourceId
		});

		console.log("Util.createPortletURL: ", url);

		return url;
	},

	/*
	html: function (domElement, html) {
		$("#" + domElement).html(html);

		$("#" + domElement + " script").each(function () {
			const newScript = document.createElement("script");
			if (this.src) {
				newScript.src = this.src;
			} else {
				newScript.textContent = this.textContent;
			}
			document.body.appendChild(newScript);
		});
	},
	*/
	html: function (domElement, html) {
		$(domElement).empty();
		$(domElement).html(html);
	},
	ajax: function ({
		namespace, //namespace of the portlet
		baseResourceURL,
		resourceId,
		type = "post",
		dataType = "json",
		params,
		successFunc,
		errorFunc
	}) {
		Util.createResourceURL({
			baseResourceURL: baseResourceURL,
			resourceId: resourceId
		})
			.then((url) => {
				$.ajax({
					url: url,
					type: type,
					dataType: dataType,
					data: Util.toNamespacedParams(namespace, params ?? {}),
					success: (successData) => {
						successFunc(successData);
					},
					error: (err) => {
						errorFunc(err);
					}
				});
			})
			.catch((err) => errorFunc(err));

		/*
		AUI().use("aui-base, portlet-url", function (A) {
			let resourceURL = Liferay.PortletURL.createURL(baseResourceURL);
			resourceURL.setResourceId(resourceId);

			console.log("ajax: ", resourceId, params, resourceURL.toString());
			$.ajax({
				url: resourceURL.toString(),
				type: type ?? "post",
				dataType: dataType ?? "json",
				data: Util.toNamespacedParams(namespace, params ?? {}),
				success: (result) => {
					successFunc(result);
				},
				error: (err) => {
					errorFunc(err);
				}
			});
		});
		*/
	},

	translate: (key, ...args) => {
		let message = Liferay.Language.get(key);

		args.forEach((arg, index) => {
			message = message.replace("{" + index + "}", String(arg));
		});

		return message;
	},

	getTranslation: (json, langugeId, defaultLanguageId) => {
		let translation = json[langugeId];

		if (Util.isEmpty(translation)) {
			if (Util.isNotEmpty(defaultLanguageId)) {
				translation = json[defaultLanguageId];
			}

			if (Util.isEmpty(translation)) {
				for (const lang in json) {
					translation = json[lang];

					if (Util.isNotEmpty(translation)) {
						break;
					}
				}
			}
		}

		return translation;
	},

	getTranslationObject(languageId, key, ...args) {
		let message = Liferay.Language.get(key);
		const transObject = {};
		transObject[languageId] = Util.translate(key, args);

		return transObject;
	},

	getTranslationsObject(languageIds, key, postfix) {
		const transObject = {};

		languageIds.forEach((lang) => {
			transObject[lang] = Liferay.Language.get(key) + (postfix ?? "");
		});

		return transObject;
	},

	convertArrayToRows: (ary, colsPerRow) => {
		let rows = [];

		if (colsPerRow <= 1) {
			rows = [...ary];
		} else {
			let quotient = Math.floor(ary.length / colsPerRow);
			let remainder = ary.length % colsPerRow;

			for (let i = 0; i < quotient; i++) {
				rows.push(ary.slice([i * colsPerRow], (i + 1) * colsPerRow));
			}

			if (remainder > 0) {
				rows.push(ary.slice([quotient * colsPerRow], quotient * colsPerRow + remainder));
			}
		}

		return rows;
	},
	randomKey: (length = 32) => {
		let mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		let result = "";
		for (let i = length; i > 0; --i) {
			result += mask[Math.floor(Math.random() * mask.length)];
		}

		return result;
	},
	unicodeToString: (str) => {
		return str.replace(/\\u([\d\w]{4})/gi, (match, grp) => {
			return String.fromCharCode(parseInt(grp, 16));
		});
	}
};
