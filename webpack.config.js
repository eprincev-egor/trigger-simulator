"use strict";

const path = require("path");
const glob = require("glob");

let entry = {};

let testsFiles = glob.sync("./tests/**/*-spec.js").concat(glob.sync("./tests/**/*-brow.js"));
testsFiles.forEach(filePath => {
    let fileName = filePath.split(/[\\/]/) || [];
    fileName = fileName.pop();
    
    if ( /-node-/.test(fileName) ) {
        return;
    }
    
    let entryName = fileName.split(".")[0];
    
    entry[ entryName ] = filePath;
});

module.exports = {
    devtool: "source-map",
    entry,
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js"
    },

    module: {
        rules: [
            {
                exclude: /(node_modules|bower_components|videojs|underscore)/,
                test: /\.js$/,
                loader: "babel-loader",
                query: {
                    presets: ["es2015"]
                }
            },
            {
                test: /\.json$/,
                loader: "json-loader"
            }
        ]
    }
};
