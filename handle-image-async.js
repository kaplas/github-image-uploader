const _ = require("lodash"),
	BPromise = require("bluebird"),
	envVars = require("./env-vars"),
	fs = require("fs"),
	request = require("request"),
	slug = require("slug");

const COMMIT_MSG = "Image upload from the upload helper app",
	VALID_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg"];

const readFileAsync = BPromise.promisify(fs.readFile);

/*
// read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
*/

function verifyParamsAsync(options) {
	const valid = _.isString(options.title) && _.isObject(options.image) && 
		_.contains(VALID_IMAGE_TYPES, options.image.type);
	return valid ? BPromise.resolve(options) : BPromise.reject(false);
}

function convertTitleToFilename(options) {
	const titleSlug = slug(options.title).toLowerCase(),
		ext = options.image.type.replace("image/", "");
	return _.extend(options, { filename: `${titleSlug}.${ext}` });
}

function getBase64InfoForImageAsync(options) {
	return readFileAsync(_.get(options, "image.path"))
		.then(function(binary) {
			return _.extend(options, {
				imageBase64: new Buffer(binary).toString("base64")
			});
		});
}

function storeImageAtGitHubAsync(options) {
	const BRANCH = envVars.get("BRANCH"),
		FOLDER = envVars.get("FOLDER"),
		REPOSITORY = envVars.get("REPOSITORY"),
		OAUTH_TOKEN = envVars.get("TOKEN"),
		OWNER = envVars.get("OWNER"),
		path = `/repos/${OWNER}/${REPOSITORY}/contents/${FOLDER}/${options.filename}`;

	const payload = {
		branch: BRANCH,
		message: COMMIT_MSG,
		content: options.imageBase64
	};

	const requestOptions = {
		url: `https://api.github.com${path}`,
		headers: {
			"Authorization": `token ${OAUTH_TOKEN}`,
			"Content-Type": "application/json",
			"User-Agent": OWNER
		},
		body: JSON.stringify(payload)
	};

	return new BPromise(function(resolve, reject) {
		request.put(
		    requestOptions,
		    function (error, response, body) {
		        if (!error && response.statusCode == 201) {
		            resolve("Upload was successful");
		        } else if (!error && response.statusCode == 422) {
		            reject("File already exists");
		        } else {
		        	reject(error || response.statusCode);
		        }
		    }
		);
	});
}

module.exports = function handleImageAsync(options) {
	const title = options.title,
		image = options.image;

	return verifyParamsAsync(options)
		.then(convertTitleToFilename)
		.then(getBase64InfoForImageAsync)
		.tap(storeImageAtGitHubAsync)
		//.tap(function(options) { console.log(options); });
}