/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
/*eslint-env node, es6 */
"use strict";

var iId = parseInt($.request.parameters.get("id"));

var conn = $.hdb.getConnection();
var query = "SELECT * FROM \"iot.DataPoint\" WHERE \"dp_id\" = ?";
var rs = conn.executeQuery(query,iId);

var body = "";
for(var item of rs){
  
	body += item.address + "\t" +
			item.room + "\t" + item.display_name.substring(0,item.display_name.indexOf(" ")).toUpperCase() + "\n";
   
}

$.response.setBody(body);
$.response.contentType = "text/plain; charset=utf-8";
$.response.status = $.net.http.OK;
