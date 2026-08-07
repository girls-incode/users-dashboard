import { User } from './user.model';

export type GroupBy = 'name' | 'age' | 'nationality' | 'country';

export interface UserGroup {
    title: string;
    users: User[];
    count: number;
}

export type UserPayload = Partial<User>;

export interface WorkerMessage {
    type: 'group';
    requestId: number;
    users: UserPayload[];
    groupBy: GroupBy;
    search: string;
}

export interface GroupResult {
    title: string;
    users: UserPayload[];
    count: number;
}

export interface IndexedGroupResult {
    title: string;
    userIndexes: number[];
    count: number;
}

export interface WorkerErrorPayload {
    message: string;
    stack?: string;
    groupBy?: GroupBy;
    searchLength?: number;
}

export interface WorkerResponseData {
    requestId: number;
    groups?: IndexedGroupResult[];
    error?: WorkerErrorPayload;
}
