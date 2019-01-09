sap.ui.define([], function () {
	"use strict";
	return {
		outdoorGetSubHeader: function(sMaxTemp,sMinTemp){
			return "Max: " + sMaxTemp + " Min: " + sMinTemp + " °C";
		},
		getCCUValue : function(sId){
		  var ts   = (new Date()).getTime(),
              sUrl = "/api/getBulk/"+sId+"?" + "&ts" + ts;
	  }
	};
});