var config = require('./config'),
    crypto = require('crypto'),
    algorithm = config.aes.algorithm,
    key = config.aes.key;


function encrypt( text ) {
    var cipher = crypto.createCipher(algorithm, key);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
}

function decrypt( text ) {
    var decipher = crypto.createDecipher(algorithm, key);
    var decrypted = decipher.update(text, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
}

module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;