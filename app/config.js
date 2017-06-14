var config = {
    phoneNumberFormat: 'GB',
};

config.http = {
    port: 3000
};

config.aes = {
    algorithm: 'aes-256-ctr',
    key: 'abc123',
};

config.db = {
    connString: 'app.db',
};

module.exports = config;