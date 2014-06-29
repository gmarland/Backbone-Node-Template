var User = require(config.userModel);

exports.getByEmail = function (email, callback) {
	User
	.find({ email: email.trim().toLowerCase() })
	.exec(function(err, users) {
		var userFound = false;

		if (err) {
			callback(err, null);
		}
		else {
			for (var i in users) {
				var user = users[i];

				if ((user) && (user.email.trim().toLowerCase() == email.trim().toLowerCase())) {
					userFound = true;

					var returnUser = {
						_id: user._id,
						sessionId: user.sessionId,
					    password: user.password,
					    email: user.email,
					    joined: user.joined
					};

		        	callback(null, returnUser);
		        	break;
		        }
		    }
		    
		    if (!userFound) {
		    	callback(null, null);
		    }
        }
	});
}

exports.getById = function (id, callback) {
	User
	.findById(id)
	.exec(function(err, user) {
		if (err) {
			callback(err, null);
		}
		else {
			if (user) {
				var returnUser = {
					_id: user._id,
					sessionId: user.sessionId,
				    username: user.username,
				    password: user.password,
				    email: user.email,
				    joined: user.joined
				};

	        	callback(null, returnUser);
	        }
	        else {
	        	callback(null, null);
	        }
        }
	});
}

exports.getBySessionId = function (id, callback) {
	User
	.findOne({ sessionId: id })
	.exec(function(err, user) {
		if (err) callback(err, null);
		else {
			if (user) {
				var returnUser = {
					_id: user._id,
					sessionId: user.sessionId,
				    username: user.username,
				    password: user.password,
				    email: user.email,
				    joined: user.joined
				};
	        	callback(null, returnUser);
	        }
	        else {
	        	callback(null, null);
	        }
        }
	});
}

exports.saveSessionId = function (id, sessionId) {
	User
	.findById(id)
	.exec(function(err, user) {
		if (err) {
			dataError.log({
				model: __filename,
				action: "saveSessionId",
				msg: "Error retrieving user",
				err: err
			});
		}
		else {
			user.sessionId = sessionId;
			user.save();
		}
	});
}

exports.get = function (req, res) {
	if (!req.isAuthenticated()) { 
		dataError.log({
			model: __filename,
			action: "get",
			msg: "Unauthorized access",
			res: res
		});
	}
	else {
		User
		.findById(req.user._id)
		.exec(function(err, user) {
			if (err) dataError.log({
				model: __filename,
				action: "get",
				msg: "Error retrieving user",
				err: err,
				res: res
			});
			else {
				var returnUser = {
					_id: user._id,
					username: user.username,
					email: user.email,
					joined: user.joined
				};
				user.password = null;
	        	res.send({ status: "success", user: returnUser });
	        }
		});
	}
}

exports.insert = function (req, res) {
	var user = new User({ 
	    username: req.body.username.trim(),
	    email: req.body.email.trim().toLowerCase(),
	    password: req.body.password
	});

	User
	.find({ email: req.body.email.trim().toLowerCase() })
	.exec(function(err, existingUsers) {
		var userExists = false;

		for (var i in existingUsers) {
			if ((existingUsers[i]) && (existingUsers[i].email.trim().toLowerCase() == req.body.email.trim().toLowerCase())) {
				userExists = true;
	        	break;
	        }
	    }

		if (!userExists) {
			user.save(function (err, savedUser) {
				if (err) dataError.log({
					model: __filename,
					action: "insert",
					msg: "Error saving user",
					err: err,
					res: res
				});
				else {
			        res.send({ status: "success", user: savedUser });
		        }
			});
		}
		else {
			dataError.log({
				model: __filename,
				msg: "Account already exists",
				res: res
			});
		}
	})
}