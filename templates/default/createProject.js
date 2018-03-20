"use strict";

const fs = require("fs");

module.exports = function(params) {
    let name = params.name;
    
    let jsFileContent = fs.readFileSync(__dirname + "/Project-spec.js" ).toString();
    jsFileContent = jsFileContent.replace(/Project/g, name);
    
    let htmlFileContent = fs.readFileSync(__dirname + "/Project.html" ).toString();
    htmlFileContent = htmlFileContent.replace(/Project/g, name);
    
    let dir = __dirname + "/../../tests/" + name;
    fs.mkdirSync(dir);
    
    fs.writeFileSync( dir + "/" + name + "-spec.js", jsFileContent );
    fs.writeFileSync( dir + "/" + name + ".html", htmlFileContent );
};
