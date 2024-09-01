export function isValidEmail(email: string): boolean {
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    return re.test(String(email).toLowerCase());
}

export function validatePassword(password: string): string | undefined {    
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (password.length > 20) {
        return 'Password must be at most 20 characters';
    }
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
    return undefined;
}
