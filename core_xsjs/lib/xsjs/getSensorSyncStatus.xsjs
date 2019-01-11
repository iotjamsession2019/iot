/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
/*eslint-env node, es6 */
var conn = $.hdb.getConnection();
var query = "SELECT * FROM \"iot.JobSettings\" WHERE \"job_type\" = ?";
var rs = conn.executeQuery(query, "SENSOR_SYNC");

var body = "";
if (rs.length === 0) {

	body = {
		running: "false",
		last_heartbeat: null
	};
	$.response.setBody(body);
	$.response.contentType = "application/json";
	$.response.status = $.net.http.OK;
} else {

	body = {
		running: (rs[0].run === "X") ? true : false,
		last_heartbeat: rs[0].last_heartbeat
	};
	$.response.setBody(body);
	$.response.contentType = "application/json";
	$.response.status = $.net.http.OK;
}