export interface IUser {
    _id: string;
    name: string;
    email: string;
    age: number;
    gender: string;
    company: Object;
    role: {
        _id: string;
        name: string;
    };
    permissions?: {
        _id: string;
        name: string;
        apiPath: string;
        module: string;
    }[];
}
