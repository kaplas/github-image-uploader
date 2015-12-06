const _ = require("lodash");

const REQUIRED_VARS = [
	"BA_USERNAME",
	"BA_PASSWORD",
	"BRANCH",
	"FOLDER",
	"OWNER",
	"REPOSITORY",
	"TOKEN"
];

function check() {
	REQUIRED_VARS.forEach(function(name) {
		if (_.isUndefined(process.env[name])) {
			const msg = `${name} is a required environment variable. Please define it before running "npm start"`
			throw new Error(msg);
		}
	});
}

function get(name) {
	return process.env[name];
}

module.exports = {
	check: check,
	get: get
}