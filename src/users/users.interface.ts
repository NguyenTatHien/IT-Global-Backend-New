export interface IUser {
    _id: string;
    name: string;
    email: string;
    age: number;
    gender: string;
    company: Object;
    address: string;
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
    image: string;
    faceDescriptor: number[][];
}
