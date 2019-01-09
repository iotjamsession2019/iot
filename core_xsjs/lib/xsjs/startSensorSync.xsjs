/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
/*eslint-env node, es6 */
"use strict";

var conn = $.hdb.getConnection();
var query = "SELECT * FROM \"iot.JobSettings\" WHERE \"job_type\" = ?";
var rs = conn.executeQuery(query, "SENSOR_SYNC");

var body = "";
if (rs.length === 0) {
	query = "INSERT INTO \"iot.JobSettings\" VALUES(?,?,?)";
	/*job_type <NVARCHAR(40)>*/
	/*run <NVARCHAR(1)>*/
	/*last_heartbeat <SECONDDATE>*/
	var insert = conn.executeUpdate(query,"SENSOR_SYNC","X",null);
	conn.commit();
	
	body = "success";
	$.response.setBody(body);
	$.response.contentType = "text/plain; charset=utf-8";
	$.response.status = $.net.http.OK;
} else {
	for (var item of rs) {

		body += item.run + "\t" + item.heartbeat + "\t" + "\n";
	}

	$.response.setBody(body);
	$.response.contentType = "text/plain; charset=utf-8";
	$.response.status = $.net.http.OK;
}