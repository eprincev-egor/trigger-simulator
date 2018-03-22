# Trigger simulator
Test your trigger logic on JavaScript with trigger simulator  
![CI status](https://circleci.com/gh/eprincev-egor/trigger-simulator.svg?style=shield)

## install
```$ npm i```  
```$ npm build```

## usage
```$ npm run create template=default project=Demo```  
```$ npm run watch```  
```$ npm run test```

Now in dir ./tests you can see new folder Demo.
Write your code in Demo/Demo-spec.js

## api
```js
"use strict";

const {Table} = require("trigger-simulator");

class MyTable extends Table {
    super();
    constructor() {
        this.columns = {
            // id is primary key with serial
            id: "number",
            name: "text",
            note: "text",
            sum: {
                type: "number",
                // default value on insert
                // can be function() {return value}
                default: 10,
                // not null
                nulls: false
            }
        };
    }
}

let table = new MyTable();

// insert empty row
let insertedRow1 = table.insert(); // {id: 1}

// insert with data
let insertedRow2 = table.insert({ name: "Hello" }); // {id: 2, name: "Hello"}

// insert array
let insertedRows = table.insert([
    {name: "Row 1"},
    {name: "Row 2"}
]);
// result
// [
//    {id: 3, name: "Row 1"},
//    {id: 4, name: "Row 2"}
// ]

// select one value
// (throw warning, only one row must be match filter)
let name1 = table.selectValue("name", row => row.id == 2); // "Hello"

// select one row
// (throw warning, only one row must be match filter)
let row1 = table.selectRow(row => row.name == "Hello"); // {id: 2, name: "Hello"}

// select some rows
let rows = table.select(row => /Row/.test(row.name));
// result
// [
//    {id: 3, name: "Row 1"} ,
//    {id: 4, name: "Row 2"}
// ]

// update all rows
table.update({ note: "nice" });
let rowsAfterUpdate = table.select(row ==> true);
// result
// [
//    {id: 1, note: "nice"} ,
//    {id: 2, name: "Hello", note: "nice"} ,
//    {id: 3, name: "Row 1", note: "nice"} ,
//    {id: 4, name: "Row 2", note: "nice"}
// ]


// update some rows
table.update({ name: "Name #1" }, row => row.id == 1);

// up sum for all rows
table.update(row => ({
    sum: row.sum + 2
}) );

// up sum for some rows
table.update(
    // set
    row => ({
        sum: row.sum * row.sum
    }), 
    // where
    row => row.id > 3 
);

// delete all rows
table.delete();

// delete some rows
table.delete(row => row.id % 2 === 0);

// Triggers:

// before insert
table.createTrigger({
    before: {
        insert: true
    }
}, function(event) {
    event.tg_op;      // insert
    event.isBefore;   // true
    event.isAfter;    // false
    event.newRow;     // inserting row object

    // in before trigger you can change data
    event.newRow.someColumns = "some value";
});

// after insert
table.createTrigger({
    after: {
        insert: true
    }
}, function(event) {
    event.tg_op;      // insert
    event.isBefore;   // false
    event.isAfter;    // true
    event.newRow;     // inserting row object
});

// before update
table.createTrigger({
    before: {
        update: true
    }
}, function(event) {
    event.tg_op;      // update
    event.isBefore;   // true
    event.isAfter;    // false
    event.newRow;     // row with changes
    event.oldRow;     // row without changes

    // in before trigger you can change data
    event.newRow.someColumns = "some value";
});

// after update
table.createTrigger({
    after: {
        update: true
    }
}, function(event) {
    event.tg_op;      // update
    event.isBefore;   // false
    event.isAfter;    // true
    event.newRow;     // row with changes (including before triggers changes)
    event.oldRow;     // row without changes
});

// update on columns
table.createTrigger({
    // before or after
    after: {
        update: ["some_column"]
    }
}, function(event) {
    // event also in simple update trigger
});

// before delete
table.createTrigger({
    before: {
        delete: true
    }
}, function(event) {
    event.tg_op;      // delete
    event.isBefore;   // true
    event.isAfter;    // false
    event.oldRow;     // deleting row object
});

// after delete
table.createTrigger({
    after: {
        delete: true
    }
}, function(event) {
    event.tg_op;      // delete
    event.isBefore;   // false
    event.isAfter;    // true
    event.oldRow;     // deleting row object
});

```
