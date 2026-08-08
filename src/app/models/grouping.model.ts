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
    /**
     * Only sent when the user array itself changed (i.e. a new page loaded). The worker keeps the
     * last set it received, so re-grouping or re-searching the same page doesn't re-clone all
     * 5,000 users across the thread boundary on every keystroke.
     */
    users?: UserPayload[];
    groupBy: GroupBy;
    search: string;
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
