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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
            before: {
                insert: true
            }
        }, (e) => {
            e.newRow.id = 1;
        });

        try {
            table.insert();
            assert.ok(false, "set id = 1 in before trigger, expected duplicate error");
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
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

        table.createTrigger({
            before: {
                update: ["name"]
            }
        }, (e) => {
            event1 = e;
        });

        table.createTrigger({
            after: {
                update: ["name"]
            }
        }, (e) => {
            event2 = e;
        });


        table.createTrigger({
            before: {
                update: ["name2"]
            }
        }, (e) => {
            event3 = e;
        });

        table.createTrigger({
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

        table.createTrigger({
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
        table.createTrigger({
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

    QUnit.test("rollback 1", function(assert) {
        class CompanyTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    inn: "text",
                    id_auto_order: "number"
                };
            }
        }

        class OrderTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    doc_date: "date",
                    doc_number: "text",
                    id_client: "number"
                };
            }
        }

        let orders = new OrderTable();
        let companies = new CompanyTable();

        companies.createTrigger({
            after: {
                insert: true
            }
        }, () => {
            orders.insert({
                doc_number: "#" + Date.now()
            });
            throw new Error("test");
        });

        try {
            companies.insert();
            assert.ok(false, "expected error");
        } catch(err) {
            assert.ok(true, "expected error");
        }

        let first_doc_number = orders.selectValue("doc_number", () => true);
        assert.equal(first_doc_number, null, "rollback order");
    });


    QUnit.test("rollback 2", function(assert) {
        class CompanyTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: "text",
                    inn: "text",
                    id_auto_order: "number",
                    orders_sum: "number"
                };
            }
        }

        class OrderTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    doc_number: "text",
                    id_client: "number",
                    sum: "number"
                };
            }
        }

        class LogsTable extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    log: "text"
                };
            }
        }

        let orders = new OrderTable();
        let companies = new CompanyTable();
        let logs = new LogsTable();

        orders.createTrigger({
            after: {
                insert: true
            }
        }, (e) => {
            let order = e.newRow;
            if ( !order.id_client || !order.sum ) {
                return;
            }

            let orders_sum = companies.selectValue("orders_sum", row => row.id == order.id_client);
            if ( !orders_sum ) {
                orders_sum = 0;
            }

            orders_sum += order.sum;
            companies.update({
                orders_sum
            }, row => row.id = order.id_client);
        });

        companies.createTrigger({
            before: {
                update: "orders_sum"
            }
        }, (e) => {
            let company = e.newRow;
            logs.insert({
                log: `Client: ${ company.id }, old sum: ${ e.oldRow.orders_sum }, new sum: ${ e.newRow.orders_sum }`
            });
        });

        let company = companies.insert({
            name: "Client 1",
            orders_sum: 0
        });

        orders.insert({
            id_client: company.id,
            sum: 100
        });
        assert.equal(company.orders_sum, 100, "add order with sum: 100");

        orders.insert({
            id_client: company.id,
            sum: 200
        });
        assert.equal(company.orders_sum, 300, "add order with sum: 200");

        companies.createTrigger({
            after: {
                update: ["orders_sum"]
            }
        }, () => {
            throw new Error("stop update");
        });

        try {
            orders.insert({
                id_client: company.id,
                sum: 200
            });
            assert.ok(false, "expected error");
        } catch(err) {
            assert.ok(true, "expected error");
        }

        assert.equal(company.orders_sum, 300, "add order with error (sum: 50)");

        let logsRows = logs.select(() => true);

        assert.equal( logsRows.length, 2, "wait only 2 logs");
        assert.equal( logsRows[0].log, "Client: 1, old sum: 0, new sum: 100", "check first log");
        assert.equal( logsRows[1].log, "Client: 1, old sum: 100, new sum: 300", "check first log");
    });

    QUnit.test("default values", function(assert) {
        class Company extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    id_country: {
                        type: "number",
                        default: 1
                    },
                    some_numb: {
                        type: "number",
                        default: 0
                    }
                };
            }
        }

        let companies = new Company();
        let company;

        company = companies.insert();
        assert.equal(company.id_country, 1, "default country");
        assert.equal(company.some_numb, 0, "default some_numb 0");

        company = companies.insert({ id_country: 2 });
        assert.equal(company.id_country, 2, "country by insert data");

        company = companies.insert({ id_country: null });
        assert.equal(company.id_country, null, "null country by insert data");

        let default_id_country_in_before_trigger;
        companies.createTrigger({
            before: {insert: true}
        }, (e) => {
            default_id_country_in_before_trigger = e.newRow.id_country;
        });

        company = companies.insert();
        assert.equal(default_id_country_in_before_trigger, 1, "default country in before trigger");
    });

    QUnit.test("not null", function(assert) {
        class Company extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    inn: {
                        type: "text",
                        nulls: false,
                        default: "(no inn)"
                    },
                    name: {
                        type: "text",
                        nulls: false
                    }
                };
            }
        }

        let companies = new Company();
        let company;

        try {
            company = companies.insert();
            assert.ok(false, "expected error on companies.insert()");
        } catch(err) {
            assert.ok(true, "expected error on companies.insert()");
        }

        company = companies.insert({ name: "nice" });
        assert.equal(company.name, "nice", "succes insert with name");

        try {
            company = companies.update({ name: null });
            assert.ok(false, "expected error on companies.update({ name: null })");
        } catch(err) {
            assert.ok(true, "expected error on companies.insert({ name: null })");
        }
    });
    
    QUnit.test("update(function)", function(assert) {
        class Company extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    sum: {
                        type: "number",
                        default: 1,
                        nulls: false
                    }
                };
            }
        }
        
        let companies = new Company();
        
        companies.insert();
        companies.insert({ sum: 100 });
        companies.insert({ sum: 200 });
        companies.insert({ sum: 300 });
        companies.insert({ sum: 400 });
        
        companies.update( company => ({ sum: company.sum * 2 }) );
        
        assert.equal(
            companies.selectValue("sum", company => company.id == 1),
            2
        );
        
        assert.equal(
            companies.selectValue("sum", company => company.id == 2),
            200
        );
        
        assert.equal(
            companies.selectValue("sum", company => company.id == 3),
            400
        );
        
        assert.equal(
            companies.selectValue("sum", company => company.id == 4),
            600
        );
        
        assert.equal(
            companies.selectValue("sum", company => company.id == 5),
            800
        );
    });
    
    QUnit.test("delete", function(assert) {
        class Company extends Table {
            constructor() {
                super();
                this.columns = {
                    id: "number",
                    name: {
                        type: "text",
                        nulls: false
                    }
                };
            }
        }
        
        let companies = new Company();
        let company;
        
        companies.insert({ name: "Hello delete" });
        company = companies.selectRow(row => row.id == 1);
        assert.equal(company.name, "Hello delete");
        
        companies.delete();
        company = companies.selectRow(row => row.id == 1);
        assert.equal(company, null);
        
        
        companies.insert({ name: "name2" });
        assert.equal(companies.selectValue("name"), "name2");
        company = companies.select(row => row.id == 2);
        company = company[0];
        assert.equal(company.name, "name2");
        
        companies.delete(row => row.id == 2);
        assert.equal(companies.selectValue("name"), null);
    });
    
    QUnit.test("before:delete 1", function( assert ) {
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

        table.createTrigger({
            before: {
                delete: true
            }
        }, (e) => {
            event = e;

            selectedRow = table.selectRow(andFilter({ id: 1 }));
        });
        
        table.insert();
        assert.equal(table.selectValue("id"), 1);
        
        table.delete();

        assert.equal(event.tg_op, "delete", "before delete e.tg_op == 'delete'");
        assert.ok(event.isBefore === true, "before delete e.isBefore === true");
        assert.ok(event.isAfter === false, "before delete e.isAfter === false");
        assert.equal(event.oldRow.id, 1, "before delete e.oldRow.id == 1");
        assert.ok(selectedRow, "in before delete trigger, you can see deleting row in selects");
    });
    
    QUnit.test("before:delete error in trigger for stop deleting", function( assert ) {
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

        table.createTrigger({
            before: {
                delete: true
            }
        }, () => {
            throw new Error("stop deleting");
        });
        
        table.insert();
        assert.equal(table.selectValue("id"), 1);
        
        try {
            table.delete();
            assert.ok(false, "expected error");
        } catch(err) {
            assert.ok(true, "expected error");
        }
        
        assert.equal(table.selectValue("id"), 1);
    });
    
    QUnit.test("after:delete 1", function( assert ) {
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

        table.createTrigger({
            after: {
                delete: true
            }
        }, (e) => {
            event = e;

            selectedRow = table.selectRow(andFilter({
                id: 1
            }));
        });

        table.insert();
        assert.equal(table.selectValue("id"), 1);
        
        table.delete();

        assert.equal(event.tg_op, "delete", "after delete e.tg_op == 'delete'");
        assert.ok(event.isBefore === false, "after delete e.isBefore === false");
        assert.ok(event.isAfter === true, "after delete e.isAfter === true");
        assert.equal(event.oldRow.id, 1, "after delete e.oldRow.id == 1");
        assert.ok(!selectedRow, "in after delete trigger, you can't see deleting row");
    });
    
    QUnit.test("after:delete error in trigger for stop deleting", function( assert ) {
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
        
        // commit must close on succes delete
        table.insert();
        table.delete();
        table.insert({ id: 1 });
        
        table.createTrigger({
            after: {
                delete: true
            }
        }, () => {
            throw new Error("stop deleting");
        });
        
        assert.equal(table.selectValue("id"), 1);
        
        try {
            table.delete();
            assert.ok(false, "expected error");
        } catch(err) {
            assert.ok(true, "expected error");
        }
        
        assert.equal(table.selectValue("id"), 1);
    });
    
    QUnit.test("default value as function", function(assert) {
        let testDefaultValue = null;
        
        class TestTable extends Table {
            constructor() {
                super();
                
                this.columns = {
                    id: "number",
                    some_column: {
                        type: "text",
                        default: () => testDefaultValue
                    }
                };
            }
        }
        
        let table = new TestTable();
        let row;
        
        testDefaultValue = null;
        row = table.insert();
        assert.equal( row.some_column, testDefaultValue );
        row = table.insert({ some_column: 0 });
        assert.equal( row.some_column, 0 );
        
        testDefaultValue = 100;
        row = table.insert();
        assert.equal( row.some_column, testDefaultValue );
        row = table.insert({ some_column: null });
        assert.equal( row.some_column, null );
    });
    
    QUnit.test("unique", function(assert) {
        class Company extends Table {
            constructor() {
                super();
                
                this.columns = {
                    id: "number",
                    name: {
                        type: "text",
                        nulls: false
                    },
                    inn: "text",
                    
                    id_parent_company: "number",
                    sort_in_parent_company: {
                        type: "number",
                        nulls: false,
                        default: 1
                    }
                };
                
                this.unique = [
                    {
                        name: "uniq_company_name",
                        columns: ["name"]
                    },
                    {
                        name: "uniq_company_inn",
                        columns: ["inn"]
                    },
                    {
                        name: "uniq_company_sort_in_parent_company",
                        columns: ["id_parent_company", "sort"]
                    }
                ];
            }
        }
        
        let companies = new Company();
        
        companies.createTrigger({
            before: {insert: true}
        }, function(event) {
            let company = event.newRow;
            
            if ( 
                company.id_parent_company != null &&
                (!company.sort || company.sort == 1)
            ) {
                let children = companies.select(row => row.id_parent_company == company.id_parent_company);
                let sorts = children.map(row => row.sort);
                sorts.push(0); // Math.max.apply(Math, []) => -Infinity
                let maxSort = Math.max.apply(Math, sorts);
                
                company.sort = maxSort + 1;
            }
        });
        
        companies.insert({
            name: "Fedor Co"
        });
        
        assert.ok(companies.selectValue("name"), "Fedor Co");
        
        try {
            companies.insert({
                name: "Fedor Co"
            });
            assert.ok(false, "expected error uniq_company_name");
        } catch(err) {
            assert.ok(true, "expected error uniq_company_name");
        }
        
        companies.insert({
            name: "Logo OS",
            inn: "123"
        });
        
        try {
            companies.insert({
                name: "Some row",
                inn: "123"
            });
            assert.ok(false, "expected error uniq_company_inn");
        } catch(err) {
            assert.ok(true, "expected error uniq_company_inn");
        }
        
        let parentCompany = companies.insert({
            name: "Parent Co",
            inn: "123456"
        });
        
        let child1 = companies.insert({
            id_parent_company: parentCompany.id,
            name: "Child 1"
        });
        
        let child2 = companies.insert({
            id_parent_company: parentCompany.id,
            name: "Child 2"
        });
        
        assert.equal( child1.sort, 1 );
        assert.equal( child2.sort, 2 );
        
        try {
            companies.insert({
                id_parent_company: parentCompany.id,
                name: "Child 3",
                sort: 2
            });
            assert.ok(false, "expected error uniq_company_sort_in_parent_company");
        } catch(err) {
            assert.ok(true, "expected error uniq_company_sort_in_parent_company");
        }
        
        companies.update({
            sort: 2
        }, row => row.id == child2.id);
        
        try {
            companies.update({
                sort: 1
            }, row => row.id == child2.id);
            
            assert.ok(false, "expected error uniq_company_sort_in_parent_company");
        } catch(err) {
            assert.ok(true, "expected error uniq_company_sort_in_parent_company");
        }
    });

});
