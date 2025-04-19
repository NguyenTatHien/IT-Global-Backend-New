import {
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
} from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESPONSE_MESSAGE = "response_message";
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE, message);

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

export const IS_PUBLIC_PERMISSION = "isPublicPermission";
export const SkipCheckPermission = () =>
    SetMetadata(IS_PUBLIC_PERMISSION, true);

// Decorator for required permissions
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

// Decorator for roles
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
