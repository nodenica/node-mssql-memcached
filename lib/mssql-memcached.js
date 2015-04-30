/**
* Created with IntelliJ IDEA.
* User: paulomcnally
* Date: 10/30/13
* Time: 8:53 PM
* To change this template use File | Settings | File Templates.
*/

var tsdt            =   require('tsdt');
var phpjs           =   require('phpjs');
var S               =   require('string');
var crypto          =   require('crypto');
var mssql           =   require('mssql');
var Memcached       =   require('memcached');
var memcached       =   null;
var memcachedServer =   null;
var debug           =   false;

/**
* @param string value
* @description Create a md5 string based on param value
*/
function getHash( value ){
  return crypto.createHash('md5').update(value).digest("hex");
}


/**
* @param array rows
* @return array results
* @description Parse data to utf-8 and trim data
*/
function toUtf8( rows ){
  var results = [];
  if( typeof rows === 'object' ){
    if( rows.length > 0 ){
      rows.forEach( function( row ){

        var obj_row = {};

        var columns = Object.keys(row);

        columns.forEach( function( column ){

          if( typeof row[column] === 'string' ){
            obj_row[column] = S( phpjs.htmlentities( row[column], "ENT_QUOTES"  ) ).trim().s;

          }
          else{
            obj_row[column] = row[column];
          }

        });

        results.push( obj_row );

      });
    }
  }

  return results;

}

/**
* @param string tag
* @param string msg
* @description Call console.log reformated to show debug messages
*/
function debugMsg(tag, msg) {
  if(debug) {
    console.log(tag + ': ' + msg + '\n');
  }
}

/**
* @param boolean boolean
* @description Set a debug var true or false
*/
exports.debug = function( boolean ){
  debug = boolean;
};

exports.types = mssql;

/**
* @param value
* @description Set server or servers memcached and set a memcached variable to new Memcached class
*/
exports.setMemcachedServers = function( value ){
  memcachedServer = value;
  var options = {
    retries: 1,
    poolSize: 100

  };
  memcached = new Memcached( value, options );

};


/**
* @param object settings
* settings.cache boolean
* settings.type string sp or query
* settings.lifetime int
* settings.inputs array objects
* @description Simple query to Microsoft SQL Server with or without memcached
*/


exports.prepare = function(settings){
  var _this = this;

  /**
  * Initialize cache
  * boolean
  */
  if(typeof settings.cache === 'undefined'){
    settings.cache = false;
  }

  /**
  * Initialize type
  * sp | query
  */
  if(typeof settings.type === 'undefined'){
    settings.type = 'sp';
  }

  /**
  * Initialize lifetime
  */
  if(typeof settings.lifetime !== 'number'){
    settings.lifetime = 86400; //one day
  }

  /**
  * Initialize type
  */
  if(typeof settings.inputs !== 'object'){
    settings.inputs = [];
  }

  /**
  * Initialize cache
  * boolean
  */
  if(typeof settings.utf8 === 'undefined'){
    settings.utf8 = true;
  }

  /**
  * Create a success function
  */
  _this.success = function(cb) {
    /*
    // deprecated
    if (typeof cb === 'function') {
    cb.call(_this.data);
  } else {
  _this.data = cb;
}
*/
};

/**
* Create a error function
*/
_this.error = function(cb) {

  switch( typeof cb ){
    case 'function':
    cb.call( _this.errorMsg  );
    break;
    default :
    _this.errorMsg = cb;
  }

};

/**
* Memcached key
*/

_this.setKey = function(){
  var stringToHash = settings.query;

  if( settings.type === 'sp' ){

    if( settings.inputs.length > 0 ){

      settings.inputs.forEach(function(obj){

        stringToHash = stringToHash + obj.value;

      });

    }

  }

  _this.key = getHash( stringToHash );

};

_this.setKey();



/**
* Create a request
*/
_this.SQLRequest = function(cache) {

  var request = _this.connection.request();

  debugMsg('Memcached Key', _this.key );

  if(cache) {

    memcached.connect( memcachedServer, function( memcachedConnectError, connectionMemcached ){
      if( memcachedConnectError ){

        debugMsg( 'Memcached Connect Error', memcachedConnectError );

        _this.errorMsg = memcachedConnectError;

        _this.error(_this.errorMsg);

      }
      else{
        debugMsg( 'Memcached Server: ', connectionMemcached.serverAddress );

        memcached.get(_this.key, function(memcachedGetError, memcachedData) {
          if(memcachedGetError){

            debugMsg( 'Memcached Get Error: ', memcachedGetError );

            _this.errorMsg = memcachedGetError;

            _this.error(_this.errorMsg);

          } else {

            if (memcachedData) {

              debugMsg( 'Result from', 'Memcached' );

              _this.data = memcachedData;

              _this.success(_this.data);

            } else {

              debugMsg( 'Result from', 'SQL Server');

              _this.SQLRequest(false);

            }
          }
        });

      }
    });


  } else {

    switch( settings.type ){

      case 'sp':

      debugMsg( 'SQL type', 'Stored Procedure' );


      if (_this.errorMsg !== null) {

        debugMsg( 'Input', _this.errorMsg );
        _this.error( _this.errorMsg );

      }
      else {

        settings.inputs.forEach(function(item){
          request.input(item.name, item.type, item.value);
        });

        request.execute( settings.query, function(requestExecuteError, recordsets, returnValue) {

          if( requestExecuteError ){

            _this.errorMsg = requestExecuteError.message;
            _this.error(_this.errorMsg);
            debugMsg( 'Request Execute Error', requestExecuteError.message );

          } else {

            if( settings.utf8 ){
              _this.data = toUtf8( recordsets[0] );

            }
            else{
              _this.data = recordsets[0];
            }

            _this.success(_this.data);

            if (settings.cache) {
              memcached.set(_this.key, recordsets[0], settings.lifetime, function ( memcachedSetError ) {
                if( memcachedSetError ){

                  _this.errorMsg = memcachedSetError;
                  _this.error(_this.errorMsg);
                  debugMsg( 'Memcached Set Error', memcachedSetError );

                } else{
                  debugMsg( 'Memcached Set Key', _this.key );
                }
              });
            }
          }

          _this.connection.close();

        });

      }

      break;

      case 'query':

      debugMsg( 'SQL type', 'Query' );

      request.query(settings.query, function(requestQueryError, recordset ) {
        if( requestQueryError ){

          _this.errorMsg = requestQueryError;
          _this.error(_this.errorMsg);
          debugMsg( 'Request Query Error', requestQueryError );

        } else {

          if( settings.utf8 ){
            _this.data = toUtf8( recordset );

          }
          else{
            _this.data = recordset;
          }

          _this.success(_this.data);

          if (settings.cache) {
            memcached.set(_this.key, recordset, settings.lifetime, function ( memcachedSetError ) {
              if( memcachedSetError ){

                _this.errorMsg = memcachedSetError;
                _this.error(_this.errorMsg);
                debugMsg( 'Memcached Set Error', memcachedSetError );

              } else{
                debugMsg( 'Memcached Set Key', _this.key );
              }
            });
          }
        }


        _this.connection.close();

      });

      break;
    }
  }
};


/**
* Add a object to array setings.inputs
* @param name
* @param type
* @param value
*/
_this.addInput = function( name, type, value ){

  function setError( typeName, value ){
    _this.errorMsg = 'Invalid data type ' + typeName  + ' ' + name  + ' : ' + value;
  }

  var obj = {};
  obj.name = name;
  obj.type = type;
  obj.value = value;

  switch( type.name ){
    case "real":  case "uniqueidentifier": case "image": case "xml":  case "bit": case "float":

    break;
    case "varchar":
    if( !tsdt.isVarchar( value ) ){
      setError( type.name, value );

    }
    break;
    case "nvarchar":
    if( !tsdt.isNvarchar( value ) ){
      setError( type.name, value );

    }
    break;
    case "text":
    if( !tsdt.isText( value ) ){
      setError( type.name, value );

    }
    break;
    case "int":
    if( !tsdt.isInt( value ) ){
      setError( type.name, value );

    }
    break;
    case "bigint":
    if( !tsdt.isBigint( value ) ){
      setError( type.name, value );

    }
    break;
    case "tinyint":
    if( !tsdt.isTinyint( value ) ){
      setError( type.name, value );

    }
    break;
    case "smallint":
    if( !tsdt.isSmallint( value ) ){
      setError( type.name, value );

    }
    break;
    case "numeric":
    if( !tsdt.isNumeric( value ) ){
      setError( type.name, value );

    }
    break;
    case "decimal":
    if( !tsdt.isDecimal( value ) ){
      setError( type.name, value );

    }
    break;
    case "date":
    if( !tsdt.isDate( value ) ){
      setError( type.name, value );

    }
    break;
    case "datetime":
    if( !tsdt.isDatetime( value ) ){
      setError( type.name, value );

    }
    break;
    case "datetimeoffset":
    if( !tsdt.isDatetimeoffset( value ) ){
      setError( type.name, value );

    }
    break;
    case "smalldatetime":
    if( !tsdt.isSmalldatetime( value ) ){
      setError( type.name, value );

    }
    break;
    case "time":
    if( !tsdt.isTime( value ) ){
      setError( type.name, value );

    }
    break;

    case "smallmoney":
    if( !tsdt.isSmallmoney( value ) ){
      setError( type.name, value );

    }
    break;
    case "money":
    if( !tsdt.isMoney( value ) ){
      setError( type.name, value );

    }
    break;
    case "binary":
    if( !tsdt.isBinary( value ) ){
      setError( type.name, value );

    }
    break;

    case "varbinary":
    if( !tsdt.isVarbinary( value ) ){
      setError( type.name, value );

    }
    break;
    case "char":
    if( !tsdt.isChar( value ) ){
      setError( type.name, value );

    }
    break;
    case "nchar":
    if( !tsdt.isNchar( value ) ){
      setError( type.name, value );

    }
    break;
    case "ntext":
    if( !tsdt.isNtext( value ) ){
      setError( type.name, value );

    }
    break;

  }

  settings.inputs.push( obj );

  // Update key
  _this.setKey();

};


/**
* Call the request
*/
_this.execute = function(){

  debugMsg( 'Execute', 'Called' );

  _this.connection = new mssql.Connection(settings.connection, function(sqlConnectionError){
    if( sqlConnectionError ){
      debugMsg( 'Sql Connection Error', sqlConnectionError );

      _this.errorMsg = sqlConnectionError;
      _this.error(_this.errorMsg);
    } else {
      debugMsg( 'Sql Connection', 'Open' );
      // Call request
      _this.SQLRequest(settings.cache);
    }
  });
};

};

/**
* Memcached delete key
*/
exports.removeKey = function( value ){
  memcached.del( value, function( removeError ){
    if( removeError ){
      debugMsg( 'Memcached del: ' , removeError );
    }

  });
};


/**
* Memcached set
*/
exports.set = function( key, data, lifetime, cb ){

  memcached.set( key, data, lifetime, function ( memcachedSetError ) {
    if( memcachedSetError ){

      cb(memcachedSetError,null);

    } else{

      cb(null,true);

    }

    return cb;

  });

};


/**
* Memcached replace
*/
exports.replace = function( key, data, lifetime, cb ){

  memcached.replace( key, data, lifetime, function ( memcachedSetError ) {
    if( memcachedSetError ){

      cb(memcachedSetError,null);

    } else{

      cb(null,true);

    }

    return cb;

  });

};


/**
* Memcached add
*/
exports.add = function( key, data, lifetime, cb ){

  memcached.add( key, data, lifetime, function ( memcachedSetError ) {
    if( memcachedSetError ){

      cb(memcachedSetError,null);

    } else{

      cb(null,true);

    }

    return cb;

  });

};


/**
* Memcached get
*/
exports.get = function( key, cb ){

  memcached.get( key, function(memcachedGetError, memcachedData) {
    if(memcachedGetError){

      cb(memcachedGetError,null);

    } else {

      if (memcachedData) {

        cb(null,memcachedData);

      } else {

        cb("Empty data",null);

      }
    }
  });

};
