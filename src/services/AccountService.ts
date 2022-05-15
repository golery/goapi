const TOKEN = 'mock_token';

export const login = (username: string, password:string) => {
    if (username === 'hly') {
        return { token : TOKEN};
    }
};