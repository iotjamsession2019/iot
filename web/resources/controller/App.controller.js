sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/resource/ResourceModel",
	"Dashboard/model/formatter"
], function (Controller, History, MessageToast, JSONModel, ResourceModel, ColorPalette, formatter) {
	"use strict";
	return Controller.extend("Dashboard.controller.App", {
		formatter: formatter,
		onInit: function () {
			//jQuery.sap.require("Dashboard.model.formatter");
			var i18nModel = new ResourceModel({
				bundleName: "Dashboard.i18n.i18n"
			});
			this._oODataModel = this.getOwnerComponent().getModel();
			this.getView().setModel(i18nModel, "i18n");
			this._oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var oViewModel;
			oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});
			this.getView().setModel(oViewModel, "appView");
			//this._oODataModel = new sap.ui.model.odata.ODataModel("/xsodata/iot.xsodata", true);
			
		},
		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},
		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		}

	});

});