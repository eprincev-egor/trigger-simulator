"use strict";

let QUnit;
if ( typeof window == "undefined" ) {
    QUnit = require("qunit").QUnit;
} else {
    QUnit = window.QUnit;
}

const Table = require("../../../src/Table");
const {andFilter, orFilter} = require("../../../src/helpers");

QUnit.module("Banks", {}, function() {
    
    class Banks extends Table {
        constructor() {
            super();
            
            this.columns = {
                id: "number",
                bik: "text",
                kor: "text",
                id_user_create: "number"
            };
        }
    }
    
    class BanksAccounts extends Table {
        constructor() {
            super();
            
            this.columns = {
                id: "number",
                account_number: "text",
                id_bank: "number",
                id_user: "number"
            };
        }
    }
    
    let banks = new Banks();
    let banksAccounts = new BanksAccounts();
    
    banks.addTrigger({
        name: "create_default_bank_account",
        after: {
            insert: true
        }
    }, function(event) {
        let bankRow = event.newRow;
        
        if ( event.newRow.id_user_create ) {
            banksAccounts.insert({
                id_bank: bankRow.id,
                id_user: bankRow.id_user_create
            });
        }
    });
    
    QUnit.test( "create account", function( assert ) {
        
        let newBank = banks.insert({
            id_user_create: 1
        });
        
        let newBankAccount = banksAccounts.selectRow(row => row.id_bank == newBank.id);
        
        assert.equal( newBankAccount.id_user, 1, "success create bank account" );
        
    });
});
