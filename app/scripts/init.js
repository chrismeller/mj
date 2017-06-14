console.log('Starting init...');

var config = require('../config');

console.log('Using connection string: ', config.db.connString);

var sqlite3 = require('sqlite3'),
    db = new sqlite3.Database( config.db.connString );

db.serialize( function() {
    console.log('Checking if tables arleady exist...');

    db.get("select name from sqlite_master where type = 'table' and name = 'clients'", ( err, row ) => {
        if ( row === undefined ) {
            console.log('Tables do not exist. Creating.');
            db.serialize( () => {
                db.run('create table clients ( email text, phone text )');
                db.run('create table clientMeta ( clientId int, key text, value text )');
            });
            console.log('Tables created.');
        }
        else {
            console.log('Tables exist. Doing nothing.');
        }

        // db.get('select count(*) as num from clients', ( err, row ) => {
        //     if ( err ) {
        //         console.log('Unable to count existing users: ', err);
        //     }
        //     else {

        //         if ( row.num > 0 ) {
        //             console.log('Users found, not seeding. Count was ', row.num);
        //         }
        //         else {
        //             console.log('No users found. Seeding test users.');

        //             var insert = db.prepare('insert into users ( name, age ) values ( ?, ? )');

        //             for ( var i = 0; i < 10; i++ ) {
        //                 var name = 'User ' + ( i + 1 );
        //                 var age = ( i + 1 ) * 3;

        //                 insert.run( [ name, age ] );

        //                 console.log('Inserted ', name);
        //             }

        //             insert.finalize();
        //         }

        //     }
        // });
    });
});