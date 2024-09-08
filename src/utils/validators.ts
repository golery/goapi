export function isValidEmail(email: string): boolean {
    const re = /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

    return re.test(String(email).toLowerCase());
}

export function validatePassword(password: string, strict?: boolean): string | undefined {
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (password.length > 36) { // 36 is the length of uuid for testing
        return 'Password must be at most 36 characters';
    }
    if (strict) {
        const upperCaseLetterRegex = new RegExp('[A-Z]');
        if (!upperCaseLetterRegex.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        const lowerCaseLetterRegex = new RegExp('[a-z]');
        if (!lowerCaseLetterRegex.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        const specialCharacterRegex = new RegExp('\\W');
        if (!specialCharacterRegex.test(password)) {
            return 'Password must contain at least one special character';
        }
        const numberRegex = new RegExp('\\d');
        if (!numberRegex.test(password)) {
            return 'Password must contain at least one number';
        }
    }
    return undefined;
}
