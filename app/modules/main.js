define([],

function() {
	var Main = {};

	Main.Index = Backbone.View.extend({
    	el: "<div>",

		initialize: function() {
			this.render();
      	},

		render: function() {
			var that = this;

			$.get("/app/templates/main/index.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},
	});

	return Main;
});