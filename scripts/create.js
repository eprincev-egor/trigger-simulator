"use strict";

let args = process.argv;
if ( !args || !args.length ) {
    args = [];
}

let params = {};
for (let i = 0, n = args.length; i < n; i++) {
    let arg = args[ i ];
    
    if ( typeof arg != "string" ) {
        arg = "";
    }
    
    arg = arg.split("=");
    let key = arg[ 0 ];
    let value = arg[ 1 ];
    
    if ( !key || !value ) {
        continue;
    }
    
    params[ key ] = value;
}


if ( !params.template ) {
    params.template = "default";
}

if ( !params.project ) {
    throw new Error("please set project=name");
}

let createProject = require("../templates/" + params.template + "/createProject.js");

params.name = params.project;
delete params.project;

createProject(params);
