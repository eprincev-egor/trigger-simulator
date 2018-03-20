"use strict";

function andFilter(where) {
    return function(row) {
        for (let key in where) {
            let rowValue = row[ key ];
            let filterValue = where[ key ];
            
            if ( rowValue != filterValue ) {
                return false;
            }
        }
        
        return true;
    };
}

function orFilter(where) {
    return function(row) {
        for (let key in where) {
            let rowValue = row[ key ];
            let filterValue = where[ key ];
            
            if ( rowValue == filterValue ) {
                return true;
            }
        }
    };
}

module.exports = {
    andFilter,
    orFilter
};
