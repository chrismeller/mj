var config = require('./config'),
    encryption = require('./encryption'),
    phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

function Client( options ) {
    if ( !options.db ) {
        throw new Error('options.db is required.');
    }

    var db = options.db;

    return {
        create: function ( client, callback ) {
            console.log('create the client!', client);

            var validationErrors = [];
            if ( client.email === undefined || client.email.trim() == '' ) {
                validationErrors.push("Email address is required.");
            }
            else {
                // validating an email address via regex is actually really stupid
                // technically just about anything@just about anything is potentially valid
                // but we'll be realistic and assume we wouldn't be getting clients
                // that are using an IP address or a hostname on the local network to receive mail
                // and that really just leaves us at testing to make sure there are:
                //  1- an @ sign
                //  2- a . in the portion after the @ sign
                //  3- at least one character in each segment of 1 and 2
                // this means that the following will match:
                //  - chris@doesnthaveone.com
                //  - "something containing invalid characters as long as it is escaped with quotes"@doesnthaveone.com
                // but these will not, even though they're technically valid
                //  - chris@somenetworkhost
                //  - chris@1.2.3.4
                // we're probably also eliminating some valid IDNs using unicode, but that's fine, too

                var r = new RegExp('(.+)@(.+)\\.(.+)');
                
                if ( r.test( client.email ) == false ) {
                    validationErrors.push("The email address appears to be invalid.");
                }
            }

            if ( client.phone === undefined || client.phone.trim() == '' ) {
                validationErrors.push("Phone number is required.");
            }
            else {
                var number = phoneUtil.parseAndKeepRawInput( client.phone, config.phoneNumberFormat );

                if ( phoneUtil.isValidNumber(number) ) {
                    // if it's a valid number, store a formatted version
                    var formatted = phoneUtil.format(number, phoneUtil.NATIONAL);

                    client.phone = formatted;
                }
                else {
                    validationErrors.push("The phone number provided is not a valid format.");
                }

            }

            if ( Object.keys(client).length > 10 ) {
                validationErrors.push("You may only provide 10 properties for a client.");
            }

            // now the more complex one - check to see if it already exists
            db.get( 'select count(*) as count from clients where email = ?', [ client.email ], ( err, row ) => {
                if ( err ) {
                    console.log('Unable to save new client: ', err);
                    callback( new Error("Unable to save new client."), null, null );
                    return;
                }

                if ( row.count > 0 ) {
                    validationErrors.push("A client with that email address already exists.");
                }

                if ( validationErrors.length > 0 ) {
                    callback( null, validationErrors, null );
                    return;
                }

                // first, we create the main client record

                // and the phone number needs to be encrypted
                var encryptedPhoneNumber = encryption.encrypt(client.phone);

                db.run( 'insert into clients ( email, phone ) values ( ?, ? )', [ client.email, encryptedPhoneNumber ], ( err ) => {
                    if ( err ) {
                        console.log('Unable to save new client: ', err);
                        callback( new Error("Unable to save new client."), null, null );
                    }

                    // we need to find out what ID it was just inserted as
                    db.get( 'select rowid as id from clients where email = ?', [ client.email ], ( err, row ) => {
                        if ( err ) {
                            console.log('Unable to save new client: ', err);
                            callback( new Error("Unable to save new client."), null, null );
                            return;
                        }

                        if ( row === undefined ) {
                            callback( new Error("Unable to save new client."), null, null );
                            return;
                        }

                        var clientId = row.id;

                        console.log('newly added client is ', clientId);

                        // now we save all the meta records
                        // first, delete the email and phone properties we know about
                        delete client['email'];
                        delete client['phone'];

                        db.serialize( () => {
                            var insert = db.prepare( 'insert into clientMeta ( clientId, key, value ) values ( ?, ?, ? )' );

                            // now we'll just iterate over all the others
                            Object.keys(client).forEach( ( key ) => {
                                console.log( 'inserting meta key ', key );
                                var value = client[ key ];
                                insert.run( [ clientId, key, value ] );
                            });

                            insert.finalize();

                            // now get back out the full client we just added
                            this.get( clientId, ( newClient ) => {
                                console.log('new client', newClient);
                                callback( null, null, newClient );
                            });
                        });
                    });
                });
            });
        },

        get: function ( id, callback ) {
            console.log('get the client with id ' , id);

            db.get('select rowid as id, email, phone from clients where id = ?', [ id ], ( err, row ) => {
                if ( err ) {
                    console.log('Unable to fetch client:', err);
                    throw new Error('Unable to fetch client.');
                }

                if ( row === undefined ) {
                    callback( null );
                    return;
                }

                // decrypt the phone number
                var decryptedPhoneNumber = this._decryptPhoneNumber( row.phone );

                // mask anything that is not whitespace, except for the last 4 digits
                var phoneNumber = this._maskPhoneNumber(decryptedPhoneNumber);

                var result = {
                    id: row.id,
                    email: row.email,
                    phone: phoneNumber,
                };

                // grab all the meta values for this client
                db.all('select key, value from clientMeta where clientId = ?', [ id ], ( err, rows ) => {
                    if ( err ) {
                        console.log('Unable to fetch client meta:', err);
                        throw new Error('Unable to fetch client.');
                    }

                    // append them all to the result we just started
                    rows.forEach( ( row ) => {
                        result[ row.key ] = row.value;
                    });

                    callback( result );
                    return;
                });
            });
        },

        search: function ( email, callback ) {
            console.log('search for clients!', email);

            // is this actually a search, or a list?
            var statement = 'select rowid as id, email, phone from clients';
            var params = [];
            if ( email != null ) {
                statement = statement + ' where email = ?';
                params = [ email ];
            }

            db.all( statement, params, ( err, clients ) => {
                if ( err ) {
                    console.log('Unable to search for clients.', err);
                    callback( new Error('Unable to search for clients.'), null );
                    return;
                }

                // for ease of access, key up the rows based on their ID from the db
                // var clients = {};
                // rows.forEach( ( row, i ) => {
                //     clients[ row.id ] = row;
                // });
                
                // first, go through and decrypt and mask all the numbers
                clients.forEach( ( client, i ) => {
                    client.phone = this._decryptAndMaskPhoneNumber( client.phone );
                });

                // now blindly get all the metadata that goes with any of those clients
                // this query is a bit screwy because i didn't want to build the IN expression,
                // but at least we keep it down to a single (big) query
                db.all( 'select clientId, key, value from clientMeta where clientId in ( select id from ( ' + statement + ' ) )', params, ( err, metaRows ) => {
                    if ( err ) {
                        console.log('Unable to search for clients.', err);
                        callback( new Error('Unable to search for clients.'), null );
                        return;
                    }

                    // now that we've got all the metadata, go through and link it back up with the client we've already got
                    metaRows.forEach( ( metaRow ) => {
                        var client = clients.find( ( value, i ) => {
                            return value.id == metaRow.clientId;
                        });

                        client[ metaRow.key ] = metaRow.value;
                    });

                    callback( null, clients );
                });
            });
        },

        _maskPhoneNumber: function ( number ) {
            return number.substring(0, number.length - 4).replace(/\S/g, 'x') + number.substring(number.length - 4);
        },

        _decryptPhoneNumber: function ( number ) {
            return encryption.decrypt( number );
        },

        _decryptAndMaskPhoneNumber: function ( number ) {
            return this._maskPhoneNumber( this._decryptPhoneNumber( number ) );
        },
    };
}

module.exports = Client;