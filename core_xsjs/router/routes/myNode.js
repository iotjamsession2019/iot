/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express");
var request = require("request");

//declarations for sync
var sCCUIP = "",
	sCCUPort = "",
	aSettings = [],
	aBlacklist = [],
	aDatapoints = [],
	connection = null,
	roundRobin = 0,
	iDataPointMax = 10000;

function getCCUIP() {
	for (var i in aSettings) {
		if (aSettings[i].param == "CCU-HISTORIAN-IP") {
			sCCUIP = aSettings[i].value;
			//console.log("CCU-Historian IP is " + sCCUIP);
			break;
		}
	}
}

function getCCUPort() {
	for (var i in aSettings) {
		if (aSettings[i].param == "CCU-HISTORIAN-PORT") {
			sCCUPort = aSettings[i].value;
			//console.log("CCU-Historian Port is " + sCCUPort);
			break;
		}
	}
}

function getMaxDatapoint() {
	for (var i in aSettings) {
		if (aSettings[i].param == "CCU-DATAPOINT-MAX") {
			iDataPointMax = parseInt(aSettings[i].value);
			//console.log("Checking for Datapoint-IDs up to " + iDataPointMax);
			break;
		}
	}
}

function getBlacklist() {
	for (var i in aSettings) {
		if (aSettings[i].param == "CCU-DATAPOINT-IGNORE") {
			aBlacklist.push(aSettings[i].value);
			console.log(aSettings[i].value + " added to Blacklist (is ignored)");
		}
	}
}

function getCurrentDatapoints() {

	// connection.query({
	// 	rowsAsArray: true,
	// 	sql: 'SELECT DP_ID FROM homematic_data_points'
	// })
	// .then((rows) => {

	// 	for (var i = 0; i < rows.length; i++) {
	// 		aDatapoints.push(parseInt(rows[i]));
	// 	}
	// 	console.log(aDatapoints.length + " datapoints already registered");
	// 	console.log("Trying to fetch new datapoints");
	// 	checkForNewDatapoints();

	// })
	// .catch(err => {
	// 	console.log("Existing datapoints could not be read");
	// })
	connection.prepare(
		"select * from \"iot.DataPoint\" ",
		function (err, statement) {
			if (err) {
				console.log("Existing datapoints could not be read");
				return;
			}
			statement.exec([],
				function (err, results) {
					if (err) {
						console.log("Existing datapoints could not be read");
						return;
					} else {
						for (var i = 0; i < results.length; i++) {
							aDatapoints.push(parseInt(results[i]));
						}
						//console.log(aDatapoints.length + " datapoints already registered");
						//console.log("Trying to fetch new datapoints");
					}
				});
		});

}

module.exports = function () {
	var app = express.Router();

	var async = require("async");

	//sync sensor data
	app.get("/sync", function (req, res) {
		var client = req.db;
		connection = client;
		client.prepare(
			"select * from \"iot.Settings\" ",
			function (err, statement) {
				if (err) {
					res.type("text/plain").status(500).send("ERROR: " + err.toString());
					return;
				}
				statement.exec([],
					function (err, results) {
						if (err) {
							res.type("text/plain").status(500).send("ERROR: " + err.toString());
							return;

						} else {
							aSettings = results;
							getCCUIP();
							getCCUPort();
							getMaxDatapoint();
							getBlacklist();
							getCurrentDatapoints();
							// var result = JSON.stringify({
							// 	Objects: results
							// });
							// res.type("application/json").status(200).send(result);
							res.send("sync is running");
						}
					});
			});
	});

	//Simple Database Select - Async Waterfall
	app.get("/example2", function (req, res) {
		var client = req.db;
		async.waterfall([

			function prepare(callback) {
				client.prepare("select SESSION_USER from \"DUMMY\" ",
					function (err, statement) {
						callback(null, err, statement);
					});
			},

			function execute(err, statement, callback) {
				statement.exec([], function (execErr, results) {
					callback(null, execErr, results);
				});
			},
			function response(err, results, callback) {
				if (err) {
					res.type("text/plain").status(500).send("ERROR: " + err.toString());
					return;
				} else {
					var result = JSON.stringify({
						Objects: results
					});
					res.type("application/json").status(200).send(result);
				}
				callback();
			}
		]);
	});
	//Hello Router
	app.get("/", function (req, res) {
		res.send("Hello World Node.js");
	});
	app.get("/example1", function (req, res) {
		var client = req.db;
		client.prepare(
			"select SESSION_USER from \"DUMMY\" ",
			function (err, statement) {
				if (err) {
					res.type("text/plain").status(500).send("ERROR: " + err.toString());
					return;
				}
				statement.exec([],
					function (err, results) {
						if (err) {
							res.type("text/plain").status(500).send("ERROR: " + err.toString());
							return;

						} else {
							var result = JSON.stringify({
								Objects: results
							});
							res.type("application/json").status(200).send(result);
						}
					});
			});
	});
	return app;
};