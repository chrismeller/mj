Installing
==========

Just like any other npm package - `npm install`.

Once everything's restored, run `npm run init` to initialize the database.

`npm start` will get you up and running on the default port of 3000.

API
===

By default node spins up at `http://localhost:3000`. The following endpoints are available:

`GET /clients` Will list out all clients in the database. Append the optional `?email=foo@bar.com` query param to search for a specific email.

`GET /client/:id` Will retrieve just a single client by the numeric ID assigned when it is created.

`POST /clients` Will create a new client. The payload should be similar to:

`{ "email": "chris@example.com", "phone": "070 1234 5678", "field1": "value1", "field2": "value2", ... }`

Be sure that your headers are set correctly and you're sending the request with `Content-Type: application/json` or the server will ignore it. The response is the full client object that was created, as it is returned from the `/client/:id` endpoint.

All results are returned as `application/json` as well, except for 404s.

Postman
-------
There is an exported collection for Postman in the root directory that includes requests for all of the endpoints for easy testing.

Validating Encryption
=====================
To verify that the phone numbers are properly being encrypted, you can use the `sqlite3` command line utility.

1. `sqlite3 app.db`
2. `.headers on`
3. `select * from clients`

There are only two columns in the `clients` table - the second one should contain the hex-encoded version of the AES encrypted phone number.

Notes
=====
* I went with a simple SQLite database that sits beside the service for storing data. Obviously this isn't ideal and we'd probably be connecting to a "real" master database if we were doing this in the real world.

* Normally I would be using a framework (probably restify since there is no web component, just a REST API), but one of the requirements was to avoid them.

* I'd have preferred to change the POST payload so that it was more strictly typed, rather than just blindly accepting a different object every time. Having something along the lines of `{ email: '...', phone: '...', meta: [ { key: '...', value: '...' }, ... ] }` would make it much easier to validate, test, and use.

* If I'd been using a framework I'd have added on pagination for the `GET /clients` endpoint, but it wasn't worth the time for example purposes. All of the building blocks (parsing the query string, passing in the pagination parameters, and building a dynamic SQL query) are all already present in that endpoint for handling the optional email address.

* The same also applies for searching by other arbitrary keys - the requisite pieces are there, it would be a simple matter of building an IN clause for the first query (`where rowid in ( select distinct clientId from clientMeta where ? = ?` with the key and value from the query string as params).

* By the end I was in callback hell. Normally I'd have taken a different approach and used something like Async.js, but I assumed that would violate the "no frameworks" requirement, so I just suffered.

* Speaking of callbacks, I wasn't terribly consistent when it came to how I was handling errors, or whether I even pass back errors. That definitely should be handled better in the real world.

* I'd also have liked to have used a library for the validation I was doing on create, but everything was simple enough to do manually.

* Enjoy the rant about validating emails in the comments...

* I wish I had used something for dependency injection. Everything here is simple enough, but it'd have made throwing together some better unit tests easier.

* There is no global error handling. If something does actually blow up the server will just crash. Definitely something that would need to be taken care of in a real app. With Express it's 3 lines of code, but doing it without a framework just wasn't worth the time.

Unit Tests
==========

There are two incredibly simple unit tests I wrote as I was testing the encryption I was using. I had intended to write more, but it was going to be incredibly difficult to work around SQLite without using dependency injection.

You can run them using `npm test`, as usual.