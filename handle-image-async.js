"use strict";

const _ = require("lodash"),
	BPromise = require("bluebird"),
	envVars = require("./env-vars"),
	fs = require("fs"),
	lwip = require("lwip"),
	request = require("request"),
	slug = require("slug");

const COMMIT_MSG = "Image upload from the upload helper app",
	VALID_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg"];

const readFileAsync = BPromise.promisify(fs.readFile),
	openImageAsync = BPromise.promisify(lwip.open);

function verifyParamsAsync(options) {
	const valid = _.isString(options.title) && _.isObject(options.image) && 
		_.contains(VALID_IMAGE_TYPES, options.image.type);
	return valid ? BPromise.resolve(options) : BPromise.reject(false);
}

function addSlugAndExtInfo(options) {
	//return _.extend(options, { filename: `${titleSlug}.${ext}` });
	return _.extend(options, {
		slug: slug(options.title).toLowerCase(),
		ext: options.image.type.replace("image/", "")
	});
}

function addImageBufferAsync(options) {
	return readFileAsync(_.get(options, "image.path"))
		.then(function(binary) {
			return _.extend(options, {
				buffer: new Buffer(binary)
			});
		});
}

function bufferToMaxSizeAsync(buffer, type, width, height) {
	return openImageAsync(buffer, type)
		.then(function(image) {
			const wScale = width / image.width(),
				hScale = height / image.height(),
				scale = Math.min(wScale, hScale);

			if (scale >= 1) {
				// Original image is already between the limits
				return buffer;
			} else {
				return BPromise.fromCallback(function(callback) {
					image.scale(scale, callback);
				}).then(function(lwipImage) {
					return BPromise.fromCallback(function(callback) {
						lwipImage.toBuffer(type, callback);
					});
				});
			}
		})
}

function getImageVersionsAsync(options) {
	let versions = [];

	versions.push(BPromise.props({
		filename: `${options.slug}.LARGE-DO-NOT-USE.${options.ext}`,
		buffer: bufferToMaxSizeAsync(options.buffer, options.ext, 2000, 2000)
	}));

	versions.push(BPromise.props({
		filename: `${options.slug}.${options.ext}`,
		buffer: bufferToMaxSizeAsync(options.buffer, options.ext, 720, 720)
	}))

	return BPromise.all(versions);
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
		content: options.buffer.toString("base64")
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
		.then(addSlugAndExtInfo)
		.then(addImageBufferAsync)
		.then(getImageVersionsAsync)
		.each(storeImageAtGitHubAsync);
}