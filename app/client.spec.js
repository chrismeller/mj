'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    config = require('./config'),
    client = require('./client');

describe('Client module', () => {

    beforeEach( () => {
        this.sandbox = sinon.sandbox.create();
    });

    afterEach( () => {
        this.sandbox.restore();
    });

    it('gets a client', () => {
        // setup a mock of our sqlite database that returns the data we care about
        var fakeDb = {
            get: function ( query, params, callback ) {
                var client = { id: 1, email: 'chris@example.com', phone: 'c26f0b4c1b638622fb7e46dd' };

                callback( null, client );
            },

            all: function ( query, params, callback ) {
                var rows = [
                    { clientId: 1, key: 'field1', value: 'value1' },
                    { clientId: 1, key: 'field2', value: 'value2' },
                    { clientId: 1, key: 'field3', value: 'value3' },
                    { clientId: 1, key: 'field4', value: 'value4' },
                    { clientId: 1, key: 'field5', value: 'value5' },
                    { clientId: 1, key: 'field6', value: 'value6' },
                    { clientId: 1, key: 'field7', value: 'value7' },
                    { clientId: 1, key: 'field8', value: 'value8' },
                ];

                callback( null, rows );
            }
        };

        client( { db: fakeDb } ).get( 1, ( result ) => {
            expect(result.id).to.eql(1);
            expect(result.email).to.eql('chris@example.com');
            expect(result.phone).to.eql('xx xxxx 5678');
            expect(Object.keys(result).length).to.eql(11);  // 10 keys + the id
        });
    });

    it('lists clients', () => {
        // setup a mock of our sqlite database that returns the data we care about
        var fakeClients = [
            { id: 1, email: 'chris@example.com', phone: 'c26f0b4c1b638622fb7e46dd' },
            { id: 2, email: 'chris@example.org', phone: 'c26f0b4c1b638622fb7e46dd' },
        ];

        var fakeMeta = [
            { clientId: 1, key: 'client1field1', value: 'client1value1' },
            { clientId: 1, key: 'client1field2', value: 'client1value2' },
            { clientId: 1, key: 'client1field3', value: 'client1value3' },
            { clientId: 1, key: 'client1field4', value: 'client1value4' },
            { clientId: 1, key: 'client1field5', value: 'client1value5' },
            { clientId: 1, key: 'client1field6', value: 'client1value6' },
            { clientId: 1, key: 'client1field7', value: 'client1value7' },
            { clientId: 1, key: 'client1field8', value: 'client1value8' },

            { clientId: 2, key: 'client2field1', value: 'client2value1' },
            { clientId: 2, key: 'client2field2', value: 'client2value2' },
            { clientId: 2, key: 'client2field3', value: 'client2value3' },
            { clientId: 2, key: 'client2field4', value: 'client2value4' },
            { clientId: 2, key: 'client2field5', value: 'client2value5' },
            { clientId: 2, key: 'client2field6', value: 'client2value6' },
            { clientId: 2, key: 'client2field7', value: 'client2value7' },
            { clientId: 2, key: 'client2field8', value: 'client2value8' },
        ];

        var fakeDb = {
            all: sinon.stub()
                .onFirstCall().callsArgWith( 2, null, fakeClients )
                .onSecondCall().callsArgWith( 2, null, fakeMeta ),
        };

        client( { db: fakeDb } ).search( null, ( err, clients ) => {
            // make sure there are the right number of clients
            expect(clients.length).to.eql(2);

            // validate the first client's data
            expect(clients[0].id).to.eql(1);
            expect(clients[0].email).to.eql('chris@example.com');
            expect(clients[0].phone).to.eql('xx xxxx 5678');
            expect(clients[0].client1field5).to.eql('client1value5');
            expect(Object.keys(clients[0]).length).to.eql(11);      // 10 + id

            // validate the second client's data
            expect(clients[1].id).to.eql(2);
            expect(clients[1].email).to.eql('chris@example.org');
            expect(clients[1].phone).to.eql('xx xxxx 5678');
            expect(clients[1].client2field5).to.eql('client2value5');
            expect(Object.keys(clients[1]).length).to.eql(11);      // 10 + id
        });
    });

    it('fails email validation', () => {
        var fakeClient = {
            email: 'something invalid',
            phone: '070 1234 5678',
            field1: 'value1',
            field2: 'value2',
            field3: 'value3',
            field4: 'value4',
            field5: 'value5',
            field6: 'value6',
            field7: 'value7',
            field8: 'value8',
        };
        
        var fakeDb = {
            get: sinon.stub()
                // the email uniqueness check
                .onFirstCall().callsArgWith( 2, null, { count: 0 } ),
        };

        client( { db: fakeDb } ).create( fakeClient, ( err, validationErrors, result ) => {
            expect(err, 'no error').to.be.a('null');
            expect(result, 'no result').to.be.a('null');

            expect(validationErrors, 'number of errors').to.have.lengthOf(1);
            expect(validationErrors[0], 'error message').to.have.string('email').and.to.have.string('invalid');
        });
    });

    it('fails phone number validation', () => {
        var fakeClient = {
            email: 'something@valid.com',
            phone: '88888',
            field1: 'value1',
            field2: 'value2',
            field3: 'value3',
            field4: 'value4',
            field5: 'value5',
            field6: 'value6',
            field7: 'value7',
            field8: 'value8',
        };
        
        var fakeDb = {
            get: sinon.stub()
                // the email uniqueness check
                .onFirstCall().callsArgWith( 2, null, { count: 0 } ),
        };

        client( { db: fakeDb } ).create( fakeClient, ( err, validationErrors, result ) => {
            expect(err).to.be.a('null');
            expect(result).to.be.a('null');

            expect(validationErrors).to.have.lengthOf(1);
            expect(validationErrors[0]).to.have.string('phone number').and.string('not').and.string('valid');
        });
    });

    it('fails email uniqueness validation', () => {
        var fakeClient = {
            email: 'something@valid.com',
            phone: '070 1234 5678',
            field1: 'value1',
            field2: 'value2',
            field3: 'value3',
            field4: 'value4',
            field5: 'value5',
            field6: 'value6',
            field7: 'value7',
            field8: 'value8',
        };
        
        var fakeDb = {
            get: sinon.stub()
                // the email uniqueness check
                .onFirstCall().callsArgWith( 2, null, { count: 1 } ),
        };

        client( { db: fakeDb } ).create( fakeClient, ( err, validationErrors, result ) => {
            expect(err).to.be.a('null');
            expect(result).to.be.a('null');

            expect(validationErrors).to.have.lengthOf(1);
            expect(validationErrors[0]).to.have.string('email').and.string('exists');
        });
    });
});