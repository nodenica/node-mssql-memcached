/**
 * Created with IntelliJ IDEA.
 * User: paulomcnally
 * Date: 10/30/13
 * Time: 8:53 PM
 * To change this template use File | Settings | File Templates.
 */

var crypto = require('crypto');
var mssql = require('mssql');
var Memcached = require('memcached');
var memcached;
var debug = false;


function getHash( value ){
    return crypto.createHash('md5').update(value).digest("hex");
}

/**
 * @param boolean
 */
exports.debug = function( boolean ){
    debug = boolean;
}



/**
 * @param value
 * @description Set server or servers memcached
 */
exports.setMemcachedServers = function( value ){
    memcached = new Memcached( value );

}


/**
 * @param query - String
 * @param connection - String
 * @param cache - Boolean
 * @param lifetime - Int
 * @param callback - function
 * @description Simple query to Microsoft SQL Server with or without memcached
 */


exports.query = function( query, connection, cache, lifetime, callback ){
    var parent = this;


    parent.success = null;

    parent.out = function( paramQuery, paramConnection, paramCache, paramLifetime, functionCallback ){

         var culito = 'ss';

        // validate cache and lifetime params
        if(typeof(paramCache)==='undefined'){
            paramCache = false;
        }

        if(typeof(paramLifetime)==='undefined'){
            paramLifetime = 86400; // one day
        }

        // validating cache or not cache

        if( paramCache ){

            if( debug ){
                console.log( 'Memcached enabled' );
            }

            // create a hash by query
            var key = getHash( paramQuery );

            if( debug ){
                console.log( 'Memcached key: ' + key );
            }

            memcached.get( key, function( errGet, memcachedData ) {
                if( errGet ){

                    if( debug ){
                        console.log( 'Memcached errGet: ' + errGet );
                    }

                    functionCallback( errGet, null );
                }
                else{
                    if( memcachedData ){

                        if( debug ){
                            console.log( 'Result from Memcached' );
                        }

                        // get data from memcached
                        functionCallback( null, memcachedData );
                    }
                    else{
                        // get data from microsoft sql server
                        var connection = new mssql.Connection( paramConnection, function( connectionError ){
                            if( connectionError ){

                                if( debug ){
                                    console.log( 'Sql connectionError: ' + connectionError );
                                }

                                functionCallback( connectionError, null );
                            }
                            else{

                                if( debug ){
                                    console.log( 'Sql Connection Open' );
                                }

                                var request = connection.request();
                                request.query( paramQuery, function( queryError, recordset ) {
                                    if( queryError ){

                                        if( debug ){
                                            console.log( 'Sql queryError: ' + queryError );
                                        }

                                        functionCallback( queryError, null );
                                    }
                                    else{
                                        memcached.set( key, recordset, paramLifetime, function ( errSet ) {
                                            if( errSet ){

                                                if( debug ){
                                                    console.log( 'Memcached errSet: ' + errSet );
                                                }

                                                functionCallback( errSet, null );
                                            }
                                            else{

                                                if( debug ){
                                                    console.log( 'Result from Sql Server' );
                                                }

                                                functionCallback( null, recordset );

                                                if( debug ){
                                                    console.log( 'Sql Connection Close' );
                                                }

                                                connection.close();
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            });

        }
        else{
            if( debug ){
                console.log( 'Memcached disabled' );
            }

            // get data from microsoft sql server
            // get data from microsoft sql server
            var connection = new mssql.Connection( paramConnection, function( connectionError ){
                if( connectionError ){

                    if( debug ){
                        console.log( 'Sql connectionError: ' + connectionError );
                    }

                    functionCallback( connectionError, null );
                }
                else{

                    if( debug ){
                        console.log( 'Sql Connection Open' );
                    }

                    var request = connection.request();
                    request.query( paramQuery, function( queryError, recordset ) {
                        if( queryError ){

                            if( debug ){
                                console.log( 'Sql queryError: ' + queryError );
                            }

                            functionCallback( queryError, null );
                        }
                        else{
                            if( debug ){
                                console.log( 'Result from Sql Server' );
                            }

                            console.log( recordset );

                            culito =  recordset;

                            functionCallback( null, recordset );

                            if( debug ){
                                console.log( 'Sql Connection Close' );
                            }

                            connection.close();
                        }
                    });
                }
            });
        }

        parent.success = culito;
    }

    parent.out( query, connection, cache, lifetime, callback );
}

