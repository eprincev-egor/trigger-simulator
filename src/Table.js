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

class Commit {
    constructor() {
        this.reverse = [];
    }

    addReverse(iteration) {
        this.reverse.push( iteration );
    }

    rollback() {
        for (let i = this.reverse.length - 1; i >= 0; i--) {
            let iteration = this.reverse[ i ];
            iteration();
        }
        this.reverse = [];
    }
}

let currentCommit = null;

class Table extends Events {
    constructor() {
        super();
        this.rows = [];
        this.idSequence = 0;

        // redefined me in your class
        this.columns = {};
        
        // redefined me in your class
        this.unique = [];
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
            select = function() {return true;};
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
            select = function() {return true;};
        }

        let rows = this.select(select);

        if ( rows.length > 1 ) {
            throw new Error("subquery returned more than one row");
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

        let isFirstIteration = false;
        if ( !currentCommit ) {
            isFirstIteration = true;
            currentCommit = new Commit();
        }

        let tmpRow = cloneRow( row );
        for (let key in this.columns) {
            let column = this.columns[ key ];

            if (
                column &&
                typeof column == "object" &&
                "default" in column
            ) {
                if ( !(key in tmpRow) ) {
                    let value = column.default;
                    if ( typeof value === "function" ) {
                        value = value();
                    }
                    tmpRow[ key ] = value;
                }
            }
        }

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
            
            // not null
            for (let key in this.columns) {
                let column = this.columns[ key ];
                if ( !column || typeof column == "string"  ) {
                    continue;
                }

                if ( column.nulls === false ) {
                    if ( tmpRow[ key ] == null ) {
                        throw new Error(key + " not null");
                    }
                }
            }
            
            // check unique constraints
            this.unique.forEach(unique => {
                // in sql null != null
                let hasNull = unique.columns.some( key => tmpRow[ key ] == null );
                
                if ( hasNull ) {
                    return;
                }
                
                this.select(row => {
                    let isDuplicate = unique.columns.every(
                        key => row[ key ] == tmpRow[ key ]
                    );
                    
                    if ( isDuplicate ) {
                        let values = unique.columns.map(key => tmpRow[ key ]);
                        throw new Error(`duplicate key value violates unique constraint "${ unique.name }" DETAIL: (${ unique.columns })=(${ values }) already exists`);
                    }
                });
            });
            
            this.rows.push(tmpRow);
            currentCommit.addReverse(() => {
                let index = this.rows.indexOf( tmpRow );
                if ( index != -1 ) {
                    this.rows.splice( index, 1 );
                }
            });

            this.trigger("after:insert", {
                tg_op: "insert",
                isBefore: false,
                isAfter: true,
                newRow: cloneRow(tmpRow)
            });

            // close commit on ok
            if ( isFirstIteration ) {
                currentCommit = null;
            }
        } catch(err) {
            if ( isFirstIteration ) {
                currentCommit.rollback();
                currentCommit = null;
            }
            throw err;
        }

        return tmpRow;
    }

    update(changes, select) {
        let isFirstIteration = false;
        if ( !currentCommit ) {
            isFirstIteration = true;
            currentCommit = new Commit();
        }

        try {
            this.select(select, row => {
                this._set(row, changes);
            });

            // close commit on ok
            if ( isFirstIteration ) {
                currentCommit = null;
            }
        } catch(err) {
            if ( isFirstIteration ) {
                currentCommit.rollback();
                currentCommit = null;
            }
            throw err;
        }
    }

    _set(row, changes) {
        if ( typeof changes == "function" ) {
            changes = changes(row);
        }
        
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
            
            // not null
            for (let key in this.columns) {
                let column = this.columns[ key ];
                if ( !column || typeof column == "string"  ) {
                    continue;
                }

                if ( column.nulls === false ) {
                    if ( tmpRow[ key ] == null ) {
                        throw new Error(key + " not null");
                    }
                }
            }
            
            // check unique constraints
            this.unique.forEach(unique => {
                // in sql null != null
                let hasNull = unique.columns.some( key => tmpRow[ key ] == null );
                
                if ( hasNull ) {
                    return;
                }
                
                // if update on unique columns
                let hasChanges = unique.columns.some(key => {
                    let prevValue = row[ key ];
                    let newValue = tmpRow[ key ];
                    
                    return newValue != prevValue;
                });
                
                if ( !hasChanges ) {
                    return;
                }
                
                this.select(row => {
                    let isDuplicate = unique.columns.every(
                        key => row[ key ] == tmpRow[ key ]
                    );
                    
                    if ( isDuplicate ) {
                        let values = unique.columns.map(key => tmpRow[ key ]);
                        throw new Error(`duplicate key value violates unique constraint "${ unique.name }" DETAIL: (${ unique.columns })=(${ values }) already exists`);
                    }
                });
            });

            let prevValues = {};
            for (let key in tmpRow) {
                let prevValue = row[ key ];
                let newValue = tmpRow[ key ];

                if ( newValue != prevValue ) {
                    prevValues[ key ] = prevValue;
                }
                row[ key ] = newValue;
            }
            currentCommit.addReverse(() => {
                for (let key in prevValues) {
                    row[ key ] = prevValues[ key ];
                }
            });

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
    
    delete(select) {
        let rows = this.select(select);
        
        let isFirstIteration = false;
        if ( !currentCommit ) {
            isFirstIteration = true;
            currentCommit = new Commit();
        }
        
        try {
            rows.forEach(row => {
                this.trigger("before:delete", {
                    tg_op: "delete",
                    isBefore: true,
                    isAfter: false,
                    oldRow: cloneRow(row)
                });
                
                let index = this.rows.indexOf( row );
                if ( index != -1 ) {
                    this.rows.splice(index, 1);
                }
                currentCommit.addReverse(() => {
                    this.rows.push( row );
                });

                this.trigger("after:delete", {
                    tg_op: "delete",
                    isBefore: false,
                    isAfter: true,
                    oldRow: cloneRow(row)
                });
            });
            
            // close commit on ok
            if ( isFirstIteration ) {
                currentCommit = null;
            }
        } catch(err) {
            if ( isFirstIteration ) {
                currentCommit.rollback();
                currentCommit = null;
            }
            throw err;
        }
    }

    createTrigger(events, callback) {
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
            
            if ( events.before.delete ) {
                this.on("before:delete", callback);
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
            
            if ( events.after.delete ) {
                this.on("after:delete", callback);
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
