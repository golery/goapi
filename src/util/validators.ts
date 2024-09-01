export function isValidEmail(email: string): boolean {
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    return re.test(String(email).toLowerCase());
}

export function isValidPassword(password: string): boolean {    
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?=.{8,})/;
    return re.test(password);
}
