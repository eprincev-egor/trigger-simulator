"use strict";

const Events = require("./Events");
const {andFilter} = require("./helpers");

function cloneRow(row) {
    let clone = {};
    for (let key in row) {
        clone[ key ] = row[ key ];
    }
    return clone;
}

class Table extends Events {
    constructor() {
        super();
        this.rows = [];
        this.idSequence = 0;
        
        // redefined me in your class
        this.columns = {};
    }
    // 
    // setIdSequence(newIndex) {
    //     this.idSequence = newIndex;
    // }
    // 
    // getIdSequence() {
    //     return this.idSequence;
    // }
    // 
    upIdSequence() {
        this.idSequence++;
        return this.idSequence;
    }
        
    select(select, iteration) {
        if ( !select ) {
            throw new Error("select must be are function");
        }
        
        let rows = this.rows.filter(row => {
            if ( select(row) ) {
                    
                if ( iteration ) {
                    iteration(row);
                }
                    
                return true;
            }
        });
            
        return rows;
    }
    
    selectRow(select) {
        if ( !select ) {
            throw new Error("select must be are function");
        }
        
        let rows = this.select(select);
            
        if ( rows.length > 1 ) {
            throw new Error("под фильтр попадают несколько строк");
        }
        
        if ( rows.length === 0 ) {
            return null;
        }
        
        return rows[0];
    }
        
    selectValue(column, select) {
        if ( !column ) {
            throw new Error("column must be are string");
        }
        
        if ( !select ) {
            throw new Error("select must be are function");
        }
        
        let row = this.selectRow(select);
        
        if ( row ) {
            return row[ column ];
        } else {
            return null;
        }
    }
    
    insert(row) {
        if ( Array.isArray(row) ) {
            return row.map(row => this.insert(row));
        }
        
        let tmpRow = cloneRow( row );
        
        try {
            this.trigger("before:insert", {
                tg_op: "insert",
                isBefore: true,
                isAfter: false,
                newRow: tmpRow
            });
            
            if ( this.columns.id ) {
                if ( !("id" in tmpRow) ) {
                    tmpRow.id = this.upIdSequence();
                }
                
                if ( tmpRow.id == null ) {
                    throw new Error("id not null");
                }
                
                let existsId = this.selectValue("id", andFilter({
                    id: tmpRow.id
                }));
                
                if ( existsId == tmpRow.id ) {
                    throw new Error("duplicate id");
                }
            }
            
            this.rows.push(tmpRow);
            
            this.trigger("after:insert", {
                tg_op: "insert",
                isBefore: false,
                isAfter: true,
                newRow: cloneRow(tmpRow)
            });
        } catch(err) {
            throw err;
        }
        
        return tmpRow;
    }
        
    update(changes, select) {
        if ( !select ) {
            // update some_table set deleted = deleted
            select = function() {return true;};
        }
        
        this.select(select, row => {
            this._set(row, changes);
        });
    }
        
    _set(row, changes) {
        let keys = Object.keys(changes);
        let oldRow = cloneRow(row);
        let oldValues = {};
        let tmpRow = cloneRow(row);
            
        for (let key in changes) {
            oldValues[ key ] = row[ key ];
            tmpRow[ key ] = changes[ key ];
        }
        
        try {
                
            this.trigger("before:update", {
                tg_op: "update",
                isBefore: true,
                isAfter: false,
                newRow: tmpRow,
                columns: keys,
                oldRow: oldRow
            });
            
            if ( this.columns.id ) {
                if ( "id" in tmpRow ) {
                    if ( tmpRow.id != row.id ) {
                        if ( tmpRow.id == null ) {
                            throw new Error("id not null");
                        }
                        
                        let existsId = this.selectValue("id", andFilter({
                            id: tmpRow.id
                        }));
                        
                        if ( existsId == tmpRow.id ) {
                            throw new Error("duplicate id");
                        }
                    }
                }
            }
                
            for (let key in tmpRow) {
                row[ key ] = tmpRow[ key ];
            }
            
            this.trigger("after:update", {
                tg_op: "update",
                isBefore: false,
                isAfter: true,
                columns: keys,
                newRow: cloneRow(row),
                oldRow: oldRow
            });
        } catch(err) {
            // restore
            for (let key in oldValues) {
                row[ key ] = oldValues[ key ];
            }
            throw err;
        }
    }
        
    addTrigger(events, callback) {
        let updateEventName,
            updateEventColumns;
            
        if ( events.before ) {
            if ( events.before.update ) {
                updateEventName = "before:update";
                updateEventColumns = events.before.update;
            }
            
            if ( events.before.insert ) {
                this.on("before:insert", callback);
            }
        }
            
        if ( events.after ) {
            if ( events.after.update ) {
                updateEventName = "after:update";
                updateEventColumns = events.after.update;
            }
            
            if ( events.after.insert ) {
                this.on("after:insert", callback);
            }
        }
            
        if ( updateEventName ) {
            this.on(updateEventName, function(e) {
                let callTrigger = true;
                    
                if ( Array.isArray(updateEventColumns) ) {
                    callTrigger = e.columns.some(
                        key => updateEventColumns.includes(key)
                    );
                }
                    
                if ( callTrigger ) {
                    callback(e);
                }
            });
        }
    }
}
    
module.exports = Table;