define([],
function() {
	var User = {};

	// User Models

	User.Model = Backbone.Model.extend({
		url: function() {
    		return this.get("id") ? "/users/" + this.get("id") : "/users";
		}
	});

	return User
});