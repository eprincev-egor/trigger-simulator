"use strict";

let QUnit;
if ( typeof window == "undefined" ) {
    QUnit = require("qunit").QUnit;
} else {
    QUnit = window.QUnit;
}

const Table = require("../../src/Table");
const {andFilter, orFilter} = require("../../src/helpers");

QUnit.module("Table", {}, function() {
    class TestTable extends Table {
        constructor() {
            super();
            this.columns = {
                id: "number",
                name: "text",
                date: "date"
            };
        }
    }
    
    QUnit.test( "insert", function( assert ) {
        let table = new TestTable();
        let firstRow, secondRow, selectedRow, row;
        
        firstRow = table.insert();
        assert.equal(firstRow.id, 1, "insert first row, id = 1");
        
        secondRow = table.insert();
        assert.equal(secondRow.id, 2, "insert second row, id = 2");
        
        
        selectedRow = table.selectRow(andFilter({
            id: 1
        }));
        assert.ok( selectedRow === firstRow, "select {id=1} === firstRow" );
        
        selectedRow = table.selectRow(andFilter({
            id: 2
        }));
        assert.ok( selectedRow === secondRow, "select {id=2} === secondRow" );
        
        row = table.insert({ name: "Hello world" });
        assert.equal(row.id, 3, "insert {name: 'Hello world'}");
        assert.equal(row.name, "Hello world", "insert {name: 'Hello world'}");
        
        let rows = table.insert([
            {name: "x"},
            {name: "y"}
        ]);
        
        assert.equal(rows && rows.length, 2, "insert arr[name x, name y]");
        assert.equal(rows[0].name, "x", "insert arr[name x, name y]");
        assert.equal(rows[1].name, "y", "insert arr[name x, name y]");
    });
    
    QUnit.test("update", function( assert ) {
        let table = new TestTable();
        let row;
    
        table.insert({
            name: "Hello world"
        });
        
        row = table.selectRow(andFilter({
            id: 1
        }));
        
        assert.equal(row.id, 1, "insert {name: 'Hello world'}  id == 1");
        assert.equal(row.name, "Hello world", "insert {name: 'Hello world'} name == 'Hello world'");
        
        
        table.update({
            name: "New value"
        }, andFilter({
            id: 1
        }));
        
        assert.equal(row.name, "New value", "update set name = 'New value' where id = 1");
        
        table.insert({ name: "second" });
        
        assert.equal( table.selectValue("name", andFilter({id: 1})), "New value", "check update all rows" );
        assert.equal( table.selectValue("name", andFilter({id: 2})), "second", "check update all rows" );
        
        table.update({ name: "nice" });
        
        assert.equal( table.selectValue("name", andFilter({id: 1})), "nice", "check update all rows" );
        assert.equal( table.selectValue("name", andFilter({id: 2})), "nice", "check update all rows" );
    });
    
    QUnit.test("select", function( assert ) {
        let table = new TestTable();
        let rows, row, value;
        
        table.insert({ name: "Test 1" });
        table.insert({ name: "Test 2" });
        table.insert({ name: "Test 3" });
        
        rows = table.select(row => {
            return row.name == "Test 1" || row.name == "Test 2";
        });
        
        assert.equal(rows.length, 2, "select Test 1 or Test 2 by handler");
        assert.equal(rows[0].name, "Test 1", "select Test 1 or Test 2 by handler");
        assert.equal(rows[1].name, "Test 2", "select Test 1 or Test 2 by handler");
        
        rows = table.select(orFilter({
            name: "Test 3",
            id: 2
        }));
        
        assert.equal(rows.length, 2, "select Test 2 or Test 2 by orFilter({ name: 'Test 3', id: 2})");
        assert.equal(rows[0].name, "Test 2", "select Test 2 or Test 2 by orFilter({ name: 'Test 3', id: 2})");
        assert.equal(rows[1].name, "Test 3", "select Test 2 or Test 2 by orFilter({ name: 'Test 3', id: 2})");
        
        row = table.selectRow(row => row.id == 3);
        assert.equal(row.id, 3, "select row by (row => row.id == 3)");
        assert.equal(row.name, "Test 3", "select row by (row => row.id == 3)");
        
        row = table.selectRow(row => row.id == 2);
        assert.equal(row.id, 2, "select row by (row => row.id == 2)");
        assert.equal(row.name, "Test 2", "select row by (row => row.id == 2)");
        
        row = table.selectRow(row => row.id == 4);
        assert.ok(!row, "row with id == 4 not found");
        
        value = table.selectValue("name", andFilter({ id: 2 }));
        assert.equal(value, "Test 2", "select value by id 2");
    });
    
    QUnit.test( "idSequence", function( assert ) {
        let table, row;
        
        table = new TestTable();
        table.insert();
        
        try {
            table.insert({ id: 1 });
            assert.ok(false, "insert ({id: 1}) expected duplicate error");
        } catch(err) {
            assert.ok(true, "insert ({id: 1}) expected duplicate error");
        }
        
        try {
            table.insert({ id: null });
            assert.ok(false, "insert ({id: null}) expected not null error");
        } catch(err) {
            assert.ok(true, "insert ({id: null}) expected not null error");
        }
        
        row = table.insert();
        assert.equal(row.id, 2, "success insert empty row, new id == 2");
        
        try {
            table.insert({ id: 2 });
            assert.ok(false, "insert ({id: 2}) expected duplicate error");
        } catch(err) {
            assert.ok(true, "insert ({id: 2}) expected duplicate error");
        }
        
        table.upIdSequence();
        row = table.insert();
        assert.equal(row.id, 4, "insert after upIdSequence, wait id 4");
        
        let row1 = table.selectRow(andFilter({ id: 1 }));
        assert.equal(row1.id, 1, "selectRow with id 1");
        
        table.update({
            id: 3
        }, andFilter({
            id: 1
        }));
        
        assert.equal(row1.id, 3, "update id 1 => 3");
        
        let tmp = table.selectRow(andFilter({
            id: 1
        }));
        
        assert.ok(!tmp, "id 1 not exists now");
        
        try {
            table.update({ id: 3 }, andFilter({ id: 4 }));
            assert.ok(false, "update set id = 3 where id = 4 expected duplicate error");
        } catch(err) {
            assert.ok(true, "update set id = 3 where id = 4 expected duplicate error");
        }
    });
    
    QUnit.test("before:insert 1", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        let event;
        let selectedRow;
        
        table.addTrigger({
            before: {
                insert: true
            }
        }, (e) => {
            event = e;
            e.newRow.name = "Nice";
            
            selectedRow = table.selectRow(andFilter({ id: 1 }));
        });
        
        let insertedRow = table.insert();
        
        assert.equal(event.tg_op, "insert", "before insert e.tg_op == 'insert'");
        assert.ok(event.isBefore === true, "before insert e.isBefore === true");
        assert.ok(event.isAfter === false, "before insert e.isAfter === false");
        assert.equal(event.newRow.id, 1, "before insert e.newRow.id == 1");
        assert.equal(insertedRow.name, "Nice", "before insert e.newRow.name = 'Nice', check insertedRow.name == 'Nice'");
        assert.ok(!selectedRow, "in before insert trigger, you can't see inserting row");
    });
    
    QUnit.test("before:insert 2", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            before: {
                insert: true
            }
        }, (e) => {
            e.newRow.id = null;
        });
        
        try {
            table.insert();
            assert.ok(false, "set id = null in before trigger, expected error");
        } catch(err) {
            assert.ok(true, "set id = null in before trigger, expected error");
        }
        
    });
    
    QUnit.test("before:insert 3", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        table.insert();
        
        table.addTrigger({
            before: {
                insert: true
            }
        }, (e) => {
            e.newRow.id = 1;
        });
        
        try {
            table.insert();
            assert.ok(false, "set id = 1 in before trigger, expected duplicate rror");
        } catch(err) {
            assert.ok(true, "set id = 1 in before trigger, expected duplicate error");
        }
        
        let rows = table.select(() => true);
        assert.equal(rows.length, 1, "insert with error can't change data");
        assert.equal(rows[0].id, 1, "insert with error can't change data");
    });
    
    QUnit.test("after:insert 1", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        let event;
        let selectedRow;
        
        table.addTrigger({
            after: {
                insert: true
            }
        }, (e) => {
            event = e;
            
            selectedRow = table.selectRow(andFilter({
                id: 1
            }));
        });
        
        let insertedRow = table.insert();
        
        assert.equal(event.tg_op, "insert", "after insert e.tg_op == 'insert'");
        assert.ok(event.isBefore === false, "after insert e.isBefore === false");
        assert.ok(event.isAfter === true, "after insert e.isAfter === true");
        assert.equal(event.newRow.id, 1, "after insert e.newRow.id == 1");
        assert.equal(insertedRow.id, 1, "after insert e.newRow.id == 1");
        assert.ok(selectedRow && selectedRow.id == 1, "in after insert trigger, you can see inserting row");
    });
    
    QUnit.test("after:insert 2", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            after: {
                insert: true
            }
        }, (e) => {
            e.newRow.name = "Never";
        });
        
        let insertedRow = table.insert({ name: "Real value" });
        
        assert.equal(insertedRow.name, "Real value", "after insert trigger can't change row by e.newRow");
        
    });
    
    
    QUnit.test("before:update 1", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        let event;
        let selectedRows;
        
        table.addTrigger({
            before: {
                update: true
            }
        }, (e) => {
            event = e;
            e.newRow.name = "Nice";
            
            selectedRows = table.select(row => row.name == "Nice" || row.name2 == "test");
        });
        
        table.insert({ name2: "old name2" });
        table.update({
            name2: "test"
        }, andFilter({
            id: 1
        }));
        
        let row = table.selectRow(andFilter({ id: 1 }));
        
        assert.equal(event.tg_op, "update", "before update e.tg_op == 'update'");
        assert.ok(event.isBefore === true, "before update e.isBefore === true");
        assert.ok(event.isAfter === false, "before update e.isAfter === false");
        assert.equal(event.newRow.id, 1, "before update e.newRow.id == 1");
        
        assert.equal(event.oldRow.name2, "old name2", "before update e.oldRow.name2 == 'old name2'");
        assert.equal(event.newRow.name2, "test", "before update e.newRow.name2 == 'test'");
        
        assert.equal(row.name, "Nice", "before update e.newRow.name = 'Nice', check updatedRow.name == 'Nice'");
        
        assert.ok(!selectedRows || !selectedRows.length, "in before update trigger, you can't see updated data by selects");
    });
    
    QUnit.test("before:update 2", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            before: {
                update: true
            }
        }, (e) => {
            e.newRow.id = null;
        });
        
        table.insert();
        
        try {
            table.update({
                name2: null
            }, andFilter({
                id: 1
            }));
            
            assert.ok(false, "set id = null in before trigger, expected error");
        } catch(err) {
            assert.ok(true, "set id = null in before trigger, expected error");
        }
    });
    
    QUnit.test("before:update 3", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            before: {
                update: true
            }
        }, (e) => {
            e.newRow.id = 2;
        });
        
        table.insert();
        table.insert();
        
        try {
            table.update({
                name2: null
            }, andFilter({
                id: 1
            }));
            
            assert.ok(false, "set id = 2 in before trigger, expected duplicate error");
        } catch(err) {
            assert.ok(true, "set id = 2 in before trigger, expected duplicate error");
        }
    });
    
    QUnit.test("before:update 4", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            before: {
                update: true
            }
        }, () => {
            throw new Error("test");
        });
        
        let insertedRow = table.insert({ name: "important value" });
        
        try {
            table.update({
                name2: "test"
            }, andFilter({
                id: 1
            }));
            assert.ok(false, "expected error test");
        } catch(err) {
            ///
        }
        
        assert.equal(insertedRow.name, "important value", "trigger with error can't change data");
        assert.equal(table.selectValue("name", andFilter({ id: 1 })), "important value", "trigger with error can't change data");
    });
    
    QUnit.test("after:update 1", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text"
                };
            }
        }
        
        let table = new TestTable();
        let event;
        let selectedRows;
        
        table.addTrigger({
            after: {
                update: true
            }
        }, (e) => {
            event = e;
            selectedRows = table.select(row => row.name == "new name");
        });
        
        table.insert();
        table.update({
            name: "new name"
        }, andFilter({
            id: 1
        }));
        
        let updatedRow = table.selectRow(andFilter({
            id: 1
        }));
        
        assert.equal(event.tg_op, "update", "after update e.tg_op == 'update'");
        assert.ok(event.isBefore === false, "after update e.isBefore === false");
        assert.ok(event.isAfter === true, "after update e.isAfter === true");
        assert.equal(event.newRow.id, 1, "after update e.newRow.id == 1");
        assert.equal(updatedRow.id, 1, "after update e.newRow.id == 1");
        
        assert.ok(selectedRows && selectedRows.length == 1, "in after update trigger, you can see updated data by selects");
    });
    
    QUnit.test("after:update 2", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            after: {
                update: true
            }
        }, (e) => {
            e.newRow.name = "Never";
        });
        
        table.insert();
        table.update({ name: "Real value" }, andFilter({ id: 1 }));
        
        let updatedRow = table.selectRow(andFilter({
            id: 1
        }));
        assert.equal(updatedRow.name, "Real value", "after update trigger can't change row by e.newRow");
        
    });
    
    QUnit.test("after:update 3", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        
        table.addTrigger({
            after: {
                update: true
            }
        }, () => {
            throw new Error("test");
        });
        
        let insertedRow = table.insert({ name: "important value" });
        
        try {
            table.update({
                name2: "test"
            }, andFilter({
                id: 1
            }));
            assert.ok(false, "expected error test");
        } catch(err) {
            ///
        }
        
        assert.equal(insertedRow.name, "important value", "trigger with error can't change data");
        assert.equal(table.selectValue("name", andFilter({ id: 1 })), "important value", "trigger with error can't change data");
    });
    
    
    QUnit.test("on update of columns 1", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    name2: "text"
                };
            }
        }
        
        let table = new TestTable();
        let event1, event2;
        let event3, event4;
        
        table.addTrigger({
            before: {
                update: ["name"]
            }
        }, (e) => {
            event1 = e;
        });
        
        table.addTrigger({
            after: {
                update: ["name"]
            }
        }, (e) => {
            event2 = e;
        });
        
        
        table.addTrigger({
            before: {
                update: ["name2"]
            }
        }, (e) => {
            event3 = e;
        });
        
        table.addTrigger({
            after: {
                update: ["name2"]
            }
        }, (e) => {
            event4 = e;
        });
        
        table.insert();
        
        table.update({ name2: "test" }, andFilter({ id: 1 }));
        
        assert.ok(!event1, "update(name2) trigger before update of columns (name) not called");
        assert.ok(!event2, "update(name2) trigger after update of columns (name) not called");
        
        assert.ok(event3, "update(name2) trigger before update of columns (name2) called");
        assert.ok(event4, "update(name2) trigger after update of columns (name2) called");
    });
    
    
    QUnit.test("on update of columns 2", function( assert ) {
        class TestTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    a: "number",
                    b: "number",
                    c: "number",
                    x: "number",
                    y: "number"
                };
            }
        }
        
        let table = new TestTable();
        let counter = 0;
        
        table.addTrigger({
            name: "set_c",
            after: {
                insert: true,
                update: ["a", "b", "x", "y"]
            }
        }, (e) => {
            let row = e.newRow;
            
            table.update({
                c: row.a * row.x + row.b * row.y
            }, andFilter({
                id: row.id
            }));
            
            counter++;
        });
        
        let row, insertedRow;
        insertedRow = table.insert({
            a: 2,
            b: 3,
            x: 5,
            y: 7
        });
        
        row = table.selectRow(andFilter({
            id: 1
        }));
        
        assert.equal(row && row.c, 31, "c = a * x + b * y = 2 * 5 + 3 * 7 = 31");
        assert.equal(insertedRow && insertedRow.c, 31, "c = a * x + b * y = 2 * 5 + 3 * 7 = 31");
        assert.equal(counter, 1, "caller counter 1");
        
        table.update({
            a: 10
        }, andFilter({ id: 1}));
        assert.equal(row && row.c, 71, "c = a * x + b * y = 10 * 5 + 3 * 7 = 71");
        row = table.selectRow(andFilter({
            id: 1
        }));
        assert.equal(row && row.c, 71, "c = a * x + b * y = 10 * 5 + 3 * 7 = 71");
        assert.equal(insertedRow && insertedRow.c, 71, "c = a * x + b * y = 10 * 5 + 3 * 7 = 71");
        assert.equal(counter, 2, "caller counter 2");
        
        table.update({
            x: 20,
            y: 100
        }, andFilter({ id: 1}));
        assert.equal(row && row.c, 500, "c = a * x + b * y = 10 * 20 + 3 * 100 = 500");
        row = table.selectRow(andFilter({
            id: 1
        }));
        assert.equal(row && row.c, 500, "c = a * x + b * y = 10 * 20 + 3 * 100 = 500");
        assert.equal(insertedRow && insertedRow.c, 500, "c = a * x + b * y = 10 * 20 + 3 * 100 = 500");
        assert.equal(counter, 3, "caller counter 3");
        
        // update same values
        table.update({
            x: 20,
            y: 100
        }, andFilter({ id: 1}));
        assert.equal(counter, 4, "caller counter 4");
        
        
        let states = [];
        table.addTrigger({
            name: "test_cases",
            after: {
                insert: true,
                update: ["c", "x", "y"]
            }
        }, (e) => {
            states.push({
                oldRow: {
                    c: e.oldRow.c,
                    x: e.oldRow.x,
                    y: e.oldRow.y
                },
                newRow: {
                    c: e.newRow.c,
                    x: e.newRow.x,
                    y: e.newRow.y
                }
            });
        });
        
        table.update({
            a: 2,
            b: 3,
            x: 5,
            y: 7
        }, andFilter({
            id: 1
        }));
        
        assert.equal(states.length, 2, "check states in trigger test_cases");
        
        assert.equal(states[0].oldRow.c, 500, "check states in trigger test_cases");
        assert.equal(states[0].oldRow.x, 5, "check states in trigger test_cases");
        assert.equal(states[0].oldRow.y, 7, "check states in trigger test_cases");
        
        assert.equal(states[0].newRow.c, 31, "check states in trigger test_cases");
        assert.equal(states[0].newRow.x, 5, "check states in trigger test_cases");
        assert.equal(states[0].newRow.y, 7, "check states in trigger test_cases");
        
        assert.equal(states[1].oldRow.c, 500, "check states in trigger test_cases");
        assert.equal(states[1].oldRow.x, 20, "check states in trigger test_cases");
        assert.equal(states[1].oldRow.y, 100, "check states in trigger test_cases");
        
        assert.equal(states[1].newRow.c, 500, "check states in trigger test_cases");
        assert.equal(states[1].newRow.x, 5, "check states in trigger test_cases");
        assert.equal(states[1].newRow.y, 7, "check states in trigger test_cases");
    });
    

});
