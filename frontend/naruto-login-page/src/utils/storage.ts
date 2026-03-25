import { User } from '../types';

const USERS_KEY = 'shinobipass_users';
const CURRENT_USER_KEY = 'shinobipass_current_user';
const ACCESS_TOKEN_KEY = 'shinobipass_access_token';

export const storage = {
    getUsers: (): User[] => {
        const data = localStorage.getItem(USERS_KEY);
        if (!data) return [];
        try {
            const decoded = atob(data);
            return JSON.parse(decoded);
        } catch (e) {
            return [];
        }
    },

    saveUser: (user: User) => {
        const users = storage.getUsers();
        const existingIndex = users.findIndex(u => u.username === user.username);
        if (existingIndex > -1) {
            users[existingIndex] = user;
        } else {
            users.push(user);
        }
        const encoded = btoa(JSON.stringify(users));
        localStorage.setItem(USERS_KEY, encoded);
    },

    getUser: (username: string): User | undefined => {
        return storage.getUsers().find(u => u.username === username);
    },

    setCurrentUser: (user: User | null) => {
        if (user) {
            const encoded = btoa(JSON.stringify(user));
            localStorage.setItem(CURRENT_USER_KEY, encoded);
        } else {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    },

    getCurrentUser: (): User | null => {
        const data = localStorage.getItem(CURRENT_USER_KEY);
        if (!data) return null;
        try {
            const decoded = atob(data);
            return JSON.parse(decoded);
        } catch (e) {
            return null;
        }
    },

    setAccessToken: (token: string | null) => {
        if (token) {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    },

    getAccessToken: (): string | null => {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
};
