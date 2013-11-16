# node-mssql-memcached [![Dependency Status](https://david-dm.org/patriksimek/node-mssql-memcached.png)](https://david-dm.org/patriksimek/node-mssql-memcached) [![NPM version](https://badge.fury.io/js/mssql-memcached.png)](http://badge.fury.io/js/mssql-memcached)

[![NPM](https://nodei.co/npm/mssql-memcached.png)](https://nodei.co/npm/mssql-memcached/)

Connect with [mssql](https://nodei.co/npm/mssql/) and implement [memcached](https://nodei.co/npm/memcached/) in your projects.

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
        lifetime: 86400
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
        type: 'query'
    });
    
    mySimpleQuery.execute();
    
    mySimpleQuery.success = function(data){
        console.log(data);
    };
    
    mySimpleQuery.error = function(error){
        console.log(error);
    };

# Remove key from memcached example
    var sql = require('mssql-memcached');

    sql.setMemcachedServers( '0.0.0.0:11211' );
    
    sql.removeKey('my_key');