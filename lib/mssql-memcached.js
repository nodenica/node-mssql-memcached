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
var memcachedServer;
var debug = false;


function getHash( value ){
    return crypto.createHash('md5').update(value).digest("hex");
}

function debugMsg(message) {
    if(debug) {
        console.log(message);
    }
}

/**
 * @param boolean
 */
exports.debug = function( boolean ){
    debug = boolean;
}

exports.types = mssql;




/**
 * @param value
 * @description Set server or servers memcached
 */
exports.setMemcachedServers = function( value ){
    memcachedServer = value;
    var options = {
        retries: 1

    };
    memcached = new Memcached( value, options );

}


/**
 * @param query - String
 * @param connection - String
 * @param cache - Boolean
 * @param lifetime - Int
 * @param callback - function
 * @description Simple query to Microsoft SQL Server with or without memcached
 */


exports.query = function(settings){
    var _this = this;

    if(settings.cache === undefined){
        settings.cache = false;
    }


    if(settings.lifetime === undefined){
        settings.lifetime = 86400; //one day
    }


    _this.success = function(cb) {
        if (typeof cp === "function") {
            cb.call(this.data);
        } else {
            this.data = cb;
        }
    }

    _this.error = function(cb) {
        if (typeof cb === "function") {
            cb.call(this.errorMsg);
        } else {
            this.errorMsg = cb;
        }        
    }

    //Opening connection
    _this.connection = new mssql.Connection(settings.connection, function(connectionSqlError){
        if( connectionSqlError ){
            debugMsg( 'Sql connectionSqlError: ' + connectionSqlError );
            _this.error(connectionSqlError);
        } else {
            debugMsg( 'Sql Connection Open' );
            _this.SQLRequest(settings.cache);
        }
    });

    _this.SQLRequest = function(cache) {

        var request = _this.connection.request();

        var key = getHash( settings.query );

        if(cache) {
            // create a hash by query

            debugMsg("Memcached enabled \n Key => " + key );



            memcached.connect( memcachedServer, function( connectionMemcachedError, connectionMemcached ){
                if( connectionMemcachedError ){
                    debugMsg( 'Memcached connectionMemcachedError: ' + connectionMemcachedError );
                    _this.errorMsg = connectionMemcachedError;
                    _this.error(_this.errorMsg);

                }
                else{
                    debugMsg( 'Memcached Connected: ' + connectionMemcached.serverAddress );

                    memcached.get(key, function(errGet, memcachedData) {
                        if(errGet){

                            debugMsg( 'Memcached errGet: ' + errGet );
                            _this.errorMsg = errGet;
                            _this.error(_this.errorMsg);

                        } else {

                            if (memcachedData) {

                                debugMsg( 'Result from Memcached' );
                                _this.data = memcachedData;
                                _this.success(_this.data);

                            } else {
                                debugMsg('Cache data not found. Querying database.');
                                _this.SQLRequest(false);
                            }
                        }
                    });

                }
            });


        } else {

            request.query(settings.query, function(queryError, recordset ) {
                if( queryError ){

                    _this.errorMsg = queryError;
                    _this.error(_this.errorMsg);
                    debugMsg( 'Sql queryError: ' + queryError );

                } else {
        
                    _this.data = recordset;
                    _this.success(_this.data);            

                    if (settings.cache) {
                        memcached.set(key, recordset, settings.lifetime, function ( errSet ) {
                            if( errSet ){

                                _this.errorMsge = errSet;
                                _this.error(_this.errorMsg);
                                debugMsg( 'Memcached errSet: ' + errSet );

                            } else{
                                debugMsg( 'Cached created with key: ' + key );
                            }
                        });
                    }
                    else{
                        debugMsg( 'Result from Sql Server.' );
                    }
                }


                _this.connection.close();

            });
        }
    }


};
