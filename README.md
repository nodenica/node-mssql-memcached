# node-mssql-memcached [![Dependency Status](https://david-dm.org/paulomcnally/node-mssql-memcached.png)](https://david-dm.org/paulomcnally/node-mssql-memcached) [![NPM version](https://badge.fury.io/js/mssql-memcached.png)](http://badge.fury.io/js/mssql-memcached)

[![NPM](https://nodei.co/npm/mssql-memcached.png?downloads=true)](https://nodei.co/npm/mssql-memcached/)

Connect with [mssql](https://nodei.co/npm/mssql/) and implement [memcached](https://nodei.co/npm/memcached/) in your projects.

# What's New v0.0.13
* Fix debugMsg params on removeKey
* Fix errorMsge undefined on memcached.set
* Autovalidate data type on addInput
* Convert data to utf8

# Stored Procedure Example
    var sql = require('mssql-memcached');

    var connection = {
        user: 'username',
        password: 'password',
        server: '0.0.0.0',
        database: 'database'
    };
    
    sql.setMemcachedServers( '0.0.0.0:11211' );
    sql.debug( true );
    var types = sql.types;
    
    
    var sp = new sql.prepare({
        query: 'my_stored_procedure',
        connection: connection,
        cache: true,
        lifetime: 86400,
        utf8: true
    });
    
    sp.addInput('param_one', types.Int, 1);
    sp.addInput('param_two', types.Int, 2);
    
    sp.execute();
    
    sp.success = function(data){
        console.log(data);
    };
    
    sp.error = function(error){
        console.log(error);
    };

# Query Example
    var sql = require('mssql-memcached');

    var connection = {
        user: 'username',
        password: 'password',
        server: '0.0.0.0',
        database: 'database'
    };
    
    sql.setMemcachedServers( '0.0.0.0:11211' );
    sql.debug( true );
    var types = sql.types;

    var mySimpleQuery = new sql.prepare({
        query: 'SELECT foo FROM bar',
        connection: connection,
        cache: true,
        lifetime: 86400,
        type: 'query',
        utf8: true
    });
    
    mySimpleQuery.execute();
    
    mySimpleQuery.success = function(data){
        console.log(data);
    };
    
    mySimpleQuery.error = function(error){
        console.log(error);
    };