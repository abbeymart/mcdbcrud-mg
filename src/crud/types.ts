/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-23
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: CRUD types
 */

import { Db, MongoClient, SortDirection } from "mongodb";
import { ModelRelationType, ModelOptionsType, ValidateMethodResponseType, TableDescType } from "../orm";
import { ResponseMessage } from "@mconnect/mcresponse";

export interface ObjectRefType {
    [key: string]: any;
}


// ModelValue will be validated based on the Model definition
export interface ActionParamType {
    [key: string]: any;         // fieldName: fieldValue, must match fieldType (re: validate) in model definition
}

export type ActionParamsType = Array<ActionParamType>;  // documents for create or update task/operation

export interface QueryParamsType {
    [key: string]: any;
}

export interface ExistParamItemType {
    [key: string]: any;
}

export type ExistParamsType = Array<ExistParamItemType>;

export type ActionExistParamsType = Array<ExistParamsType>

export interface ProjectParamsType {
    [key: string]: number; // 1 for inclusion and 0 for exclusion
}

export type SortParamsType = Map<string, SortDirection> // key:direction => 1 for "asc", -1 for "desc"


export type ObjectType = ObjectRefType | object;

export interface BaseModelType {
    _id?: string;
    language?: string;
    description?: string;
    appId?: string;
    isActive?: boolean;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RelationBaseModelType {
    description?: string;
    isActive?: boolean;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface GetRecordStats {
    skip?: number;
    limit?: number;
    recordsCount?: number;
    totalRecordsCount?: number;
    queryParams?: QueryParamsType;
    recordIds?: Array<string>;
    expire?: number;
}

export type GetRecords = Array<ObjectType>;

export interface GetResultType {
    records: GetRecords,
    stats: GetRecordStats,
    logRes?: ResponseMessage;
    taskType?: string;
}

export interface CrudResultType {
    queryParam?: QueryParamsType;
    recordIds?: Array<string>;
    recordsCount?: number;
    records?: ActionParamsType;
    taskType?: string;
    logRes?: ResponseMessage;
}

export interface SaveResultType {
    queryParam?: QueryParamsType;
    recordIds?: Array<string>;
    recordsCount?: number;
    taskType?: string;
    logRes?: ResponseMessage;
}

export enum TaskTypes {
    CREATE = "create",
    INSERT = "insert",
    UPDATE = "update",
    READ = "read",
    DELETE = "delete",
    REMOVE = "remove",
    LOGIN = "login",
    LOGOUT = "logout",
    APPLOG = "applog",
    SYSLOG = "syslog",
    ERRORLOG = "errorlog",
    UNKNOWN = "unknown",
}

// auditLog types

// auditLog types

export interface LogRecordsType {
    logRecords?: any;
    queryParam?: QueryParamsType;
    recordIds?: Array<string>;
    tableFields?: Array<string>;
}

export interface AuditLogParamsType {
    tableName?: string;
    logRecords?: LogRecordsType;
    newLogRecords?: LogRecordsType;
    logBy?: string;
    auditTable?: string;
    // recordParams?: LogRecordsType;
    // newRecordParams?: LogRecordsType;
}

export interface AuditType {
    _id?: string;
    tableName?: string;
    logRecords?: LogRecordsType;
    newLogRecords?: LogRecordsType;
    logType?: string;
    logBy?: string;
    logAt?: Date | string;
}

export enum AuditLogTypes {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    REMOVE = "remove",
    GET = "get",
    READ = "read",
    LOGIN = "login",
    LOGOUT = "logout",
    APPLOG = "applog",
    SYSLOG = "syslog",
    ERRORLOG = "errorlog",
    CUSTOM = "custom",
}

export interface EmailAddressType {
    [key: string]: string,
}

export interface ProfileType extends BaseModelType {
    userId?: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    phone?: string;
    emails?: Array<EmailAddressType>,
    recEmail?: string;
    roleId?: string | null;
    dateOfBirth?: Date | string;
    twoFactorAuth?: boolean;
    authAgent?: string;
    authPhone?: string;
    postalCode?: string;
}

export interface UserInfoType {
    userId: string;
    firstname: string;
    lastname: string;
    language: string;
    loginName: string;
    token: string;
    expire: number;
    group?: string;
    email?: string;
}

export interface OkResponse {
    ok: boolean;
}

export enum ServiceCategory {
    Solution = "solution",
    Microservice = "microservice",
    PackageGroup = "package group",
    Package = "package",
    Function = "function",
    UseCase = "use case",
    Table = "table",
    Collection = "collection",
    Documentation = "documentation",
    FastLinks = "fast links",
}

export interface SubItemsType {
    tableName: string;
    hasRelationRecords: boolean;
}

export interface RoleServiceResponseType {
    serviceId: string;
    roleId: string;
    roleIds: Array<string>;
    serviceCategory: string;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canCrud: boolean;
    tableAccessPermitted?: boolean;
}

export interface CheckAccessType {
    userId: string;
    roleId: string;
    roleIds: Array<string>;
    isActive: boolean;
    isAdmin: boolean;
    roleServices?: Array<RoleServiceResponseType>;
    tableId?: string;
    profile?: ProfileType;
}

export interface RoleServiceType {
    serviceId: string;
    groupId: string;
    serviceCategory: string;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    tableAccessPermitted?: boolean;
}

export interface RoleFuncType {
    (it1: string, it2: RoleServiceResponseType): boolean;
}

export type FieldValueTypes =
    string
    | number
    | boolean
    | object
    | Array<string>
    | Array<number>
    | Array<boolean>
    | Array<object>
    | unknown;

export type PromiseResponseType = Promise<string>
    | Promise<number>
    | Promise<boolean>
    | Promise<Array<string>>
    | Promise<Array<number>>
    | Promise<Array<boolean>>
    | Promise<Array<object>>;

export interface ActionParamTaskType {
    createItems: ActionParamsType;
    updateItems: ActionParamsType;
    recordIds?: Array<string>;
}

export interface AppParamsType {
    appId?: string;
    accessKey?: string;
    appName?: string;
    category?: string;
    serviceId?: string;
    serviceTag?: string;
}

export interface CrudParamsType {
    appDb: Db;
    tableName: string;
    dbClient: MongoClient;
    dbName: string;
    docDesc?: TableDescType;
    userInfo?: UserInfoType;
    nullValues?: ActionParamType;
    defaultValues?: ActionParamType;
    actionParams?: ActionParamsType;
    existParams?: ActionExistParamsType;
    queryParams?: QueryParamsType;
    recordIds?: Array<string>;
    projectParams?: ProjectParamsType;
    sortParams?: SortParamsType;
    token?: string;
    options?: CrudOptionsType;
    taskName?: string;
    taskType?: TaskTypes | string;
    skip?: number;
    limit?: number;
    appParams?: AppParamsType;
}

export interface CrudOptionsType {
    skip?: number;
    limit?: number;
    parentTables?: Array<string>;
    childTables?: Array<string>;
    parentRelations?: Array<ModelRelationType>;
    childRelations?: Array<ModelRelationType>;
    recursiveDelete?: boolean;
    checkAccess?: boolean
    auditTable?: string;
    serviceTable?: string;
    userTable?: string;
    roleTable?: string;
    accessTable?: string;
    verifyTable?: string;
    accessDb?: Db;
    auditDb?: Db;
    serviceDb?: Db;
    accessDbClient?: MongoClient;
    auditDbClient?: MongoClient;
    serviceDbClient?: MongoClient;
    accessDbName?: string;
    auditDbName?: string;
    serviceDbName?: string;
    maxQueryLimit?: number;
    logCrud?: boolean;
    logCreate?: boolean;
    logUpdate?: boolean;
    logRead?: boolean;
    logDelete?: boolean;
    logLogin?: boolean;
    logLogout?: boolean;
    unAuthorizedMessage?: string;
    recExistMessage?: string;
    cacheExpire?: number;
    modelOptions?: ModelOptionsType;
    loginTimeout?: number;
    usernameExistsMessage?: string;
    emailExistsMessage?: string
    msgFrom?: string;
    validateFunc?: ValidateMethodResponseType;
    fieldSeparator?: string;
    queryFieldType?: string;
    appDbs?: Array<string>;
    appTables?: Array<string>;
    cacheResult?: boolean;
    getAllRecords?: boolean;
    userId?: string;
}

