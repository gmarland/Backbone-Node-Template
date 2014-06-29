var express = require("express"),
	cookieParser = require("cookie-parser"),
	bodyParser = require("body-parser"),
	session = require("express-session"),
	path = require("path"),
	mongoose = require("mongoose"),
	passport = require("passport"),
	LocalStrategy = require("passport-local").Strategy;

// Read config file

	global.config = require(path.join(__dirname, "package.json")).config;

// Instantiate Express

	var app = express();

// Configure Express			
	
	app.set("view engine", "ejs");

	// angular app
  	app.use("/app", express.static(__dirname + "/app"));

	// static resources that don"t need compiling
	app.use("/libs", express.static(__dirname + "/views/libs"));
	app.use("/img", express.static(__dirname + "/views/img"));
	app.use("/fonts", express.static(__dirname + "/views/fonts"));
	app.use("/styles", express.static(__dirname + "/views/styles"));	
	
	app.use(cookieParser());
	app.use(bodyParser());
	app.use(session({ secret: config.sessionID }));
	app.use(passport.initialize());
	app.use(passport.session());

// Create the http server
	
	var http = require("http").createServer(app).listen(8080);

// Catch any uncaught errors that have been thrown

	process.on("uncaughtException", function(err) {
		console.log("************************** UNCAUGHT EXCEPTION: " + err);
	});

// Set up the connection to the mongo database

	mongoose.connect(config.mongoAddress);

// Include the global erro handler
	
	global.dataError = require(config.customModulesFolder + "data-error.js");
	global.sessionHelper = require(config.customModulesFolder + "session-helper.js");

// Include the controllers

	var users = require(config.controllerPath + "users");

// Configure local passport authentication
	
	passport.serializeUser(function(user, done) {
		done(null, user._id);
	});
	
	passport.deserializeUser(function(id, done) {
		users.getById(id, function(err, user) {
			done(err, user);
		});
	});
	
	passport.use(new LocalStrategy({ passReqToCallback: true },
		function(req, username, password, done) {
			if (req.isAuthenticated()) {
				var authenticatedUser = {
					_id: req.user._id, 
					sessionId: req.user.sessionId,
					email: req.user.email,
					joined: req.user.joined
				}	 
				     
				return done(null, authenticatedUser);
			}
			else if ((username.trim().length > 0) && (password.trim().length > 0)) {
				users.getByEmail(username, function(err, user) {
					if (err) return done(err, false, { message: "Incorrect e-mail" });

					if (!user) return done(null, false, { message: "Incorrect e-mail" });

					if (password != user.password) { 
						return done(null, false, { message: "Incorrect password." });
					}

					if (!user.sessionId) {
						var sessionId = sessionHelper.createGUID();
						user.sessionId = sessionId;	
						users.saveSessionId(user._id, sessionId);
					}

					return done(null, user);
				});
			}
			else {
				var cookies = [];

				req.headers.cookie && req.headers.cookie.split(";").forEach(function( cookie ) {
					var parts = cookie.split("=");
					cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || "" ).trim();
				});

				if(cookies[config.cookieID]) {
					users.getBySessionId(cookies[config.cookieID], function(err, user) {
						if ((err) || (!user)) return done(null, null);
						else return done(null, user);
					});
				}

				else return done(null, null);
			}
		}
	));


// REST Routes

	app.get("/*", function(req, res, next) {
		if (req.headers.host.match(/^www\./) != null) {
			res.redirect("http://" + req.headers.host.slice(4) + req.url, 301);
		} else next();
	});

	// Actions for user authentication

	app.post("/auth", function(req, res, next) {
		passport.authenticate("local", function(err, user, info) {
			if (err) {
				return res.send({ status: "failed", message: err.message});
			}
			else if (!user) {
				return res.send({ status: "failed", message: info.message});
			}
			else {
				req.logIn(user, function(err) {
					if (err) return res.send({ status: "failed", message: err.message});

					user.password = null;

					return res.send({ status: "success", user: user });
				});
			}
		})(req, res, next);
	});
	
	app.delete("/auth", function(req, res, next) {
		req.logout();
		req.session.destroy();

		return res.send({ status: "success" });
	});
	
	app.get("/checkAuthenticated", function(req, res, next) {
	 	checkAuthenticated(req, res, function(user) {
			if (user) {
				return res.send({ status: "success", user: user });
			}
			else {
				return res.send({ status: "failed" });
			}
		});
	});
	
	function checkAuthenticated(req, res, callback) {
		if (req.isAuthenticated()) {
			var authenticatedUser = {
				_id: req.user._id, 
				sessionId: req.user.sessionId,
				email: req.user.email,
				joined: req.user.joined
			}

			return callback(authenticatedUser);
		}
		else {
			var cookies = [];

			req.headers.cookie && req.headers.cookie.split(";").forEach(function( cookie ) {
				var parts = cookie.split("=");
				cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || "" ).trim();
			});

			if(cookies[config.cookieID]) {
				users.getBySessionId(cookies[config.cookieID], function(err, authenticatedUser) {
					if (authenticatedUser) {
						req.login(authenticatedUser, function(err) {
							return callback(authenticatedUser);
						});
					}
					else {
						return callback(null);
					}
				});
			}
			else {
				return callback(null);
			}
		}
	}

	// Main actions

	app.get("/", function(req,res) { 
		res.render("index", { title: "Template" }); 
	});
	
	app.get("/login", function(req,res) {
		checkAuthenticated(req, res, function(user) {
			if (user) {
				res.redirect("/main");
			}
			else {
				res.render("index", { title: "Template" }); 
			}
		});
	});
	
	app.get("/signup", function(req,res) {
		checkAuthenticated(req, res, function(user) {
			if (user) {
				res.redirect("/main");
			}
			else {
				res.render("index", { title: "Template" }); 
			}
		});
	});

	app.get("/main", function(req,res) { 
		checkAuthenticated(req, res, function(user) {
			if (user) {
				res.render("index", { title: "Template" });
			}
			else { 
				res.redirect("/login");
			}
		});
	});
	
	app.post("/users", users.insert);