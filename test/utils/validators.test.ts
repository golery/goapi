import { assert } from 'chai';
import { describe } from 'mocha';
import { isValidEmail, isValidPassword } from '../../src/util/validators';

describe('validators', function () {
    it('#isValidEmail', async () => {            
        assert.isTrue(isValidEmail('simple@google.com'));
        assert.isTrue(isValidEmail('Test_noop+1234@test123.test.tv'));
    
        assert.isFalse(isValidEmail('test'));
        assert.isFalse(isValidEmail('testtest.com'));
        assert.isFalse(isValidEmail('test@test'));
    });

    it('#isValidPassword', async () => {       
        // at least 8 chars, 1 lower case, 1 upper case, 1 number     
        assert.isTrue(isValidPassword('Aa#12345'));

        // fails for 7 chars
        assert.isFalse(isValidPassword('Aa#1234'));
        // fails for no upper case
        assert.isFalse(isValidPassword('aa#12345'));
        // fails for no lower case
        assert.isFalse(isValidPassword('AA#12345'));
        // fails for no special characters
        assert.isFalse(isValidPassword('Aab12345'));
    });
});
