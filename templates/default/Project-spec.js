"use strict";

let QUnit;
if ( typeof window == "undefined" ) {
    QUnit = require("qunit").QUnit;
} else {
    QUnit = window.QUnit;
}

const Table = require("../../src/Table");
const {andFilter, orFilter} = require("../../src/helpers");

QUnit.module("Project", {}, function() {
    
    QUnit.test( "init", function( assert ) {
        
        assert.ok( true, "Project test" );
        
    });
});
