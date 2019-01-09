sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/m/MessageToast",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/resource/ResourceModel",
		"Dashboard/model/formatter"
	], function (Controller, MessageToast, JSONModel, ResourceModel, ColorPalette, formatter) {
	"use strict";
	return Controller.extend("Dashboard.controller.App", {
		formatter: formatter,
		onInit: function () {
			//jQuery.sap.require("Dashboard.model.formatter");
			var i18nModel = new ResourceModel({
					bundleName: "Dashboard.i18n.i18n"
				});
			this.getView().setModel(i18nModel, "i18n");
			this._oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
		}

	});

});
