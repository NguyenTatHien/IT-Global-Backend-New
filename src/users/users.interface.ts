export interface IUser {
    _id: string;
    name: string;
    email: string;
    age: number;
    gender: string;
    address: string;
    employeeCode: string;
    department: {
        _id: string;
        name: string;
        prefix: string;
    };
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
    faceDescriptors: number[][];
    registeredFaces: string[];
    faceCount: number;
    lastFaceUpdate: Date;
    isFaceVerified: boolean;
}
