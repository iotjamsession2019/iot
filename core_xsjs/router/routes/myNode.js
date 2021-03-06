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
			//console.log(aSettings[i].value + " added to Blacklist (is ignored)");
		}
	}
}

function isBlacklisted(sIdentifier) {
	for (var i in aBlacklist) {
		if (sIdentifier === aBlacklist[i]) {
			return true;
		}
	}
	return false;
}

function storeNewDatapoint(iDP, oDP) {
	//console.log("Creating new datapoint " + iDP);
	var iDPId = iDP;
	var oDPObject = oDP;
	connection.prepare(
		"insert into \"iot.DataPoint\" values(?,?,?,?,?,?,?,?,?,?,?,?,?)",
		function (err, statement) {
			if (err) {
				console.log("Could not insert new datapoint");
				return;
			}
			statement.exec([
					[parseInt(iDPId),
						oDPObject.result.historyTableName,
						oDPObject.result.id.address,
						oDPObject.result.id.identifier,
						oDPObject.result.attributes.displayName,
						oDPObject.result.attributes.room,
						oDPObject.result.attributes.paramSet,
						oDPObject.result.attributes.unit,
						oDPObject.result.attributes.maximum,
						oDPObject.result.attributes.minimum,
						oDPObject.result.attributes.type,
						oDPObject.result.attributes.defaultValue,
						null
					]
				],
				function (err, results) {
					aDatapoints.push(parseInt(iDPId));
					if (aDatapoints.length === 1) {
						intervalSync();
					}
				});
		});
}

function fetchDatapoint(iDP) {
	var iDatapoint = iDP;
	//console.log("trying to fetch datapoint " + iDP);

	request('http://' + sCCUIP + ':' + sCCUPort + "/query/jsonrpc.gy?m=getDataPoint&p1=" + iDP, function (error, response, body) {
		if (error) {
			console.log(error);
			return;
		}
		if (response.statusCode == 200) {
			var oDP = JSON.parse(body);
			if (oDP.result) {
				if (oDP.result.id.identifier && isBlacklisted(oDP.result.id.identifier) ||
					oDP.result.historyTableName.substring(0, 1) !== "D") {
					//console.log(oDP.result.id.identifier + " is blacklisted");
				} else {
					storeNewDatapoint(iDatapoint, oDP);
				}
			}
		}
	});
}

function intervalSync() {
	//console.log("Getting new data from registered datapoints");
	connection.prepare(
		"select \"run\" from \"iot.JobSettings\" where \"job_type\" = ?",
		function (err, statement) {
			if (err) {
				console.log(err);
				return;
			}
			statement.exec(["SENSOR_SYNC"],
				function (err, results) {
					if (err) {
						console.log(err);
						return;
					} else {

						if (results[0] && results[0].run && results[0].run === 'X') {
							//job should run...update heartbeat...
							if (aDatapoints.length === 0) {
								return;
							}
							connection.prepare("update \"iot.JobSettings\" set \"last_heartbeat\" = ? where \"job_type\" = ? ",
								function (err, statement) {
									if (err) {
										console.log(err);
										return;
									}
									statement.exec([
											[new Date().toISOString(),
												"SENSOR_SYNC"
											]
										],
										function (err, results) {
											if (err) {
												console.log(err);
												return;
											}
											if (roundRobin < aDatapoints.length) {
												//console.log("Getting new data for datapoint " + aDatapoints[roundRobin] + " ...");
												getNewData(aDatapoints[roundRobin]);
												roundRobin++;
											} else {
												roundRobin = 0;
												intervalSync();
											}

										});
								});

						} else {
							console.log("Job terminated! not active in JobSettings-Table");
							return;
						}
					}
				});
		});

}

function readData(iDP, tsFrom, tsTo) {
	var ts2 = tsTo,
		ts1 = tsFrom,
		iDelta = tsTo - tsFrom,
		iDPId = iDP,
		sQuery = {
			"id": iDPId,
			"method": "getTimeSeriesRaw",
			"params": [iDPId, ts1, ts2]
		},
		sUrl = 'http://' + sCCUIP + ':' + sCCUPort + "/query/jsonrpc.gy?j=" + JSON.stringify(sQuery);
	if (new Date(ts1).toLocaleString() === new Date(ts2).toLocaleString()) {
		console.log("Datapoint " + iDPId + " is up to date...next please...");
		connection.prepare("update \"iot.DataPoint\" set \"last_ts_read\" = ? where \"dp_id\" = ? ",
			function (err, statement) {
				if (err) {
					console.log("Could not insert new data");
					return;
				}
				statement.exec([
						[new Date(ts2 - 600).toISOString(),
							iDPId
						]
					],
					function (err, results) {
						if (err) {
							console.log(err);
							return;
						} else {
							//console.log("Storing new timestamp for datapoint " + iDPId);
							intervalSync();
						}

					});
			});

	} else {
		//no more than 1 day at once...
		if (iDelta > 86400000) {
			readData(iDP, ts1, (ts2 - parseInt(iDelta / 2)));
		} else {
			//console.log("Datapoint " + iDPId + ": now getting data from " + new Date(ts1).toLocaleString() + " to " + new Date(ts2).toLocaleString());
			request(sUrl, function (error, response, body) {
				if (error) {
					console.log(error);
					intervalSync();
				} else if (response) {
					if (response.statusCode == 200) {
						var oResult = JSON.parse(body);
						if (oResult) {
							if (oResult.result.states.length === 0) {
								readData(iDPId, ts2, new Date().getTime());
							} else {
								//console.log(oResult.result.states.length + " records received. Storing now...");
								var iData = [];
								for (var s = 0; s < oResult.result.states.length; s++) {
									if (oResult.result.timestamps[s] !== undefined &&
										oResult.result.values[s] !== undefined &&
										oResult.result.states[s] !== undefined) {
										iData.push([
											parseInt(iDPId),
											new Date(oResult.result.timestamps[s]).toISOString(),
											parseFloat(oResult.result.values[s]),
											parseInt(oResult.result.states[s])
										]);
									}
								}

								connection.prepare("insert into \"iot.DataValues\" values(?,?,?,?)",
									function (err, statement) {
										if (err) {
											console.log(err);
											console.log("Could not insert new data");
											return;
										}

										statement.exec(iData,
											function (err, results) {
												if (err) {
													console.log(err);
													return;
												}

											});

									});

							}

							//store last_ts_read
							connection.prepare("update \"iot.DataPoint\" set \"last_ts_read\" = ? where \"dp_id\" = ? ",
								function (err, statement) {
									if (err) {
										console.log(err);
										console.log("Could not insert new data");
										return;
									}
									statement.exec([
											[new Date(ts2).toISOString(),
												iDPId
											]
										],
										function (err, results) {
											if (err) {
												console.log(err);
												return;
											} else {
												//console.log("New data for datapoint " + iDPId + " written successfully");
												intervalSync();
											}
										});
								});

						}
						//}
					} else {
						intervalSync();
					}
				}
			});

		}
	}

}

function getNewData(iDP) {
	var iDPId = iDP;
	connection.prepare(
		"select \"last_ts_read\",\"table_name\" from \"iot.DataPoint\" where \"dp_id\" =  " + iDPId,
		function (err, statement) {
			if (err) {
				console.log("last timestamp of datapoint " + iDPId + " could not be read");
				return;
			}
			statement.exec([],
				function (err, results) {
					if (err) {
						console.log("last timestamp of datapoint " + iDPId + " could not be read");
						return;
					} else {
						if (results[0].last_ts_read === null) {
							var tsFrom = new Date("2018-12-01").getTime(),
								tsTo = new Date().getTime();
							readData(iDPId, tsFrom, tsTo);
						} else {
							console.log("Last TS of datapoint " + iDPId + " is " + new Date(results[0].last_ts_read).toISOString());
							var tsFrom = new Date(results[0].last_ts_read).getTime(),
								tsTo = new Date().getTime();
							readData(iDPId, tsFrom, tsTo);
						}
					}
				});
		});

}

function checkForNewDatapoints() {
	for (var i = 1; i <= iDataPointMax; i++) {
		var bExists = false;
		for (var j = 0; j < aDatapoints.length; j++) {
			if (aDatapoints[j] === i) {
				bExists = true;
				break;
			}
		}
		if (!bExists) {
			fetchDatapoint(i);
		}
	}
	intervalSync();
}

function getCurrentDatapoints() {
	connection.prepare(
		"select \"dp_id\" from \"iot.DataPoint\" ",
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
							aDatapoints.push(parseInt(results[i].dp_id));
						}
						//console.log(aDatapoints.length + " datapoints already registered");
						//console.log("Trying to fetch new datapoints");
						checkForNewDatapoints();
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
		connection.prepare(
			"select \"run\" from \"iot.JobSettings\" where \"job_type\" = ?",
			function (err, statement) {
				if (err) {
					console.log(err);
					return;
				}
				statement.exec(["SENSOR_SYNC"],
					function (err, results) {
						if (err) {
							console.log(err);
							return;
						} else {
							if (results[0] && results[0].run && results[0].run === 'X') {
								connection.prepare(
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
													res.send("sync is running");
												}
											});
									});
							} else {
								console.log("Job terminated! not active in JobSettings-Table");
								res.send("Job terminated! not active in JobSettings-Table");
								return;
							}
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