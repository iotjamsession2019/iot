/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
/*eslint-env node, es6 */
"use strict";

var conn = $.hdb.getConnection();
var query = "SELECT FROM iot.Settings { " +
	        " param as \"Parameter\", " +
            " index as \"Index\", " +
            " value as \"Value\" " +
            " } ";
var rs = conn.executeQuery(query);

var body = "";
for(var item of rs){
  
	body += item.Parameter + "\t" +
			item.Index + "\t" + item.Value + "\n";
   
}

$.response.setBody(body);
$.response.contentType = "application/vnd.ms-excel; charset=utf-16le";
$.response.headers.set("Content-Disposition",
		"attachment; filename=Settings.xls");
$.response.status = $.net.http.OK;

