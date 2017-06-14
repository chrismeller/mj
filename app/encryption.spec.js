var encryption = require('./encryption'),
    expect = require('chai').expect;

describe('Encryption module', () => {
    it('encrypt text', () => {
        var text = 'foo bar baz';
        var expected = '9330445d4b31c022ac290b';

        var result = encryption.encrypt(text);

        expect(result).to.eql(expected);
    });

    it('decrypt text', () => {
        var encrypted = '9330445d4b31c022ac290b';
        var expected = 'foo bar baz';

        var result = encryption.decrypt(encrypted);

        expect(result).to.eql(expected);
    });
});