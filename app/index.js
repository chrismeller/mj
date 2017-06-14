'use strict';

var config = require('./config'),
    http = require('http'),
    port = config.http.port,
    sqlite3 = require('sqlite3'),
    db = new sqlite3.Database( config.db.connString ),
    clientHandler = require('./client')( { db: db } ),
    postProcessor = require('./post-processor'),
    queryString = require('querystring');

var requestHandler = ( request, response ) => {
    var url = require('url');
    var parsedUrl = url.parse( request.url );

    if ( request.method == 'GET' && parsedUrl.pathname == '/clients' ) {
        response.setHeader('Content-Type', 'application/json');

        var email = null;
        // pull out the email property, if there is one
        if ( parsedUrl.query != null ) {
            var parsedQuery = queryString.parse( parsedUrl.query );

            if ( parsedQuery['email'] !== undefined ) {
                email = parsedQuery['email'];
            }
        }

        clientHandler.search( email, ( error, result ) => {
            if ( error ) {
                response.statusCode = 500;
                response.end(JSON.stringify( { 'error': error } ));
            }

            response.end(JSON.stringify(result));
        });
    }
    else if ( request.method == 'GET'
        && parsedUrl.path.match( new RegExp('/client/(\\d+)') ) ) {
        response.setHeader('Content-Type', 'application/json');
        
        // pull the ID we want out of the URL
        var regex = new RegExp('/client/(\\d+)');
        var id = parsedUrl.path.match(regex)[1];

        clientHandler.get(id, ( result ) => {
            response.end(JSON.stringify(result));
        })
    }
    else if ( request.method == 'POST' && parsedUrl.path == '/clients' ) {
        response.setHeader('Content-Type', 'application/json');
        
        // grrr. no framework, so we have to do this ourselves
        postProcessor.process(request, () => {
            clientHandler.create( JSON.parse(request.postData), ( error, validationErrors, result ) => {
                if ( error ) {
                    response.statusCode = 500;
                    response.end(JSON.stringify( { 'error': error } ));
                }

                if ( validationErrors !== null ) {
                    response.statusCode = 400;
                    response.end(JSON.stringify( { 'validationErrors': validationErrors } ));
                }

                response.end(JSON.stringify(result));
            });
        });
    }
    else {
        response.statusCode = 404;
        response.end('Page not found.');
    }
};

var server = http.createServer( requestHandler );

server.listen( port, ( error ) => {
    if ( error ) {
        return console.log('something broke', error );
    }

    console.log( 'server is listening on port ', port );
});

// var clientHandler = {
//     add: function( request, response ) {
//         response.end('POST /clients');
//     },

//     get: function ( request, response ) {
//         response.end('GET /client');
//     },

//     search: function ( request, response ) {
//         response.end('GET /clients');
//     }
// };