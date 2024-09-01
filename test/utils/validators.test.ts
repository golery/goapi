import { assert } from 'chai';
import { describe } from 'mocha';
import { isValidEmail, validatePassword } from '../../src/util/validators';

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
        assert.isUndefined(validatePassword('Aa!12345'));
        assert.isUndefined(validatePassword('A_a_bc-de#!12345'));
    

        // fails for 7 chars
        assert.equal(validatePassword('Aa#1234'), 'Password must be at least 8 characters');
        // fails for > 20 chars
        assert.equal(validatePassword('Aa#12345678901234567890'), 'Password must be at most 20 characters');    
        // fails for no upper case
        assert.equal(validatePassword('aa#12345'), 'Password must contain at least one uppercase letter');
        // fails for no lower case
        assert.equal(validatePassword('AA#12345'), 'Password must contain at least one lowercase letter');
        // fails for no special characters
        assert.equal(validatePassword('Aab12345'), 'Password must contain at least one special character');
    });
});
