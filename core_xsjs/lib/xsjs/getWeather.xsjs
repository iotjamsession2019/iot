/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
/*eslint-env node, es6 */
var conn = $.hdb.getConnection();
var query = "SELECT * FROM \"iot.Settings\" WHERE \"param\" = ?";
var rs = conn.executeQuery(query, "API_KEY_WEATHER");
var api_key = "";
var city = "";
var aCities = [];

if (rs.length === 0) {
	console.log("no API-Key for Openweathermaps in Settings-Table (param = \"API_KEY_WEATHER\"");
}
api_key = rs[0].value;
query = "SELECT * FROM \"iot.Settings\" WHERE \"param\" = ?";
rs = conn.executeQuery(query, "WEATHER_CITY");
if (rs.length === 0) {
	console.log("no City for Openweathermaps in Settings-Table (param = \"WEATHER_CITY\"");
}

for (var item of rs) {

	city = item.value;

	 	var dest = $.net.http.readDestination("OPEN_WEATHER_MAPS");
	 	console.log(dest);

	 	var client = new $.net.http.Client();
	 	console.log(client);
	 	var req = new $.web.WebRequest($.net.http.GET, "/data/2.5/forecast?&APPID=475ad116da89bbe2ebd36011eaf2962a&q=" + city +	"&units=metric&mode=json&cnt=1&lang=de");
	 	console.log(req);
		client.request(req, dest);

		var response = client.getResponse();

		console.log("response " + response.status + " body " + response.body.asString());

}