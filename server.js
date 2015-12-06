const basicAuth = require('basic-auth'),
    BPromise = require("bluebird"),
    envVars = require("./env-vars"),
    express = require("express"),
    formidable = require("formidable"),
    handleImageAsync = require("./handle-image-async"),
    mustacheExpress = require('mustache-express'),
    path = require("path"),
    util = require("util");

const PORT = process.env.PORT || 8000;

envVars.check();

const app = express();
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');

// Copied from https://davidbeath.com/posts/expressjs-40-basicauth.html
function auth(req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    };

    if (user.name === envVars.get("BA_USERNAME") &&
        user.pass === envVars.get("BA_PASSWORD")) {
        return next();
    } else {
        return unauthorized(res);
    };
};
app.use(auth);

function getFileUploadAsync(req) {
    return new BPromise(function(resolve, reject) {
        var form = new formidable.IncomingForm();
        form.parse(req, function(err, fields, files) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    image: files && files.originalImage,
                    title: fields && fields.imageTitle
                })
            }
        });
    });
}

// Your own super cool function
var logger = function(req, res, next) {
    //console.log(req);
    if (req && req.files) {
        console.log(req.files);
    } else {
        console.log("Not a file");
    }
    next(); // Passing the request to the next handler in the stack.
}

//app.use(logger); // Here you add your logger to the stack.

app.use(express.static(__dirname + '/src'));

app.post("/upload", function(req, res) {

    getFileUploadAsync(req)
        .then(handleImageAsync)
        .then(function() {
            res.render('ready', { title: "Valmis!", linkText: "Lähetä uusi kuva" });
        })
        .catch(function(error) {
            res.render('ready', { title: `Oi voi! ${error}`, linkText: "Koita uudelleen?" });
        })

    /*var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(util.inspect({fields: fields, files: files}));
    });*/
});

var server = app.listen(PORT, function() {
  console.log('Example app listening at http://%s:%s',
    server.address().address, server.address().port);
});
