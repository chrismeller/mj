function process( request, callback ) {
    var data = '';

    request.on('data', ( chunk ) => {
        data += chunk;
    });

    request.on('end', () => {
        request.postData = data;

        callback();
    });
}

module.exports.process = process;