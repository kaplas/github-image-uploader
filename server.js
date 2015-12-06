const express = require("express"),
	formidable = require("formidable"),
	path = require("path"),
	util = require("util");

const PORT = process.env.PORT || 8000;

const app = express();


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
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(util.inspect({fields: fields, files: files}));
    });
});

var server = app.listen(PORT, function() {
  console.log('Example app listening at http://%s:%s',
  	server.address().address, server.address().port);
});
