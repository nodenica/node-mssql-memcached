module.exports = process.env.MSSQLMEMCACHED_COV
    ? require('./lib-cov/mssql-memcached')
    : require('./lib/mssql-memcached');