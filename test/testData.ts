// @Description: test-cases data: for get, delete and save record(s)

import {
    UserInfoType, CrudOptionsType, ActionParamType,
    TaskTypes, QueryParamsType, ActionParamsType, ModelRelationType, RelationTypes, RelationActionTypes, ModelDescType,
    BaseModel, DataTypes, ModelCrudOptionsType, newModel,
} from "../src"
import {collections} from "./collections";

// Models

// TODO: include groups and categories collections, with relations-specs

export const groupModel: ModelDescType = {
    collName   : collections.GROUPS,
    docDesc    : {
        ...BaseModel,
        name   : {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        ownerId: DataTypes.STRING,
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}

export const categoryModel: ModelDescType = {
    collName   : collections.CATEGORIES,
    docDesc    : {
        ...BaseModel,
        name     : {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        groupId  : {
            fieldType: DataTypes.MONGODB_ID,
            allowNull: false,
        },
        groupName: {
            fieldType: DataTypes.STRING,
            allowNull: false,
        },
        priority : {
            fieldType   : DataTypes.INTEGER,
            allowNull   : false,
            defaultValue: 100,
        },
        iconStyle: {
            fieldType   : DataTypes.STRING,
            allowNull   : false,
            defaultValue: "fa fa-briefcase",
        },
        parentId : DataTypes.MONGODB_ID,
        path     : DataTypes.STRING,

    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}

export const groupRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.GROUPS,
        targetColl  : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "groupId",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
    {
        sourceColl  : collections.GROUPS,
        targetColl  : collections.CATEGORIES,
        sourceField : "name",
        targetField : "groupName",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupName",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.CASCADE,
    },
];

export const categoryRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.CATEGORIES,
        targetColl  : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "parentId",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "parentId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
]

export const centralRelations: Array<ModelRelationType> = [
    ...groupRelations,
    ...categoryRelations,
]

const options: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name"],
    ],
}

// instantiate model
export const GroupModel = newModel(groupModel, options);

const categoryOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name", "groupId",],
        ["name", "groupName",],
    ]
}
// instantiate model
export const CategoryModel = newModel(categoryModel, categoryOptions);


export interface AuditType {
    id: string;
    collName: string;
    collDocuments: any;
    newCollDocuments: any;
    logType: string;
    logBy: string;
    logAt: Date;
}

export const AuditModel: AuditType = {
    id              : "",
    collName        : "",
    collDocuments   : null,
    newCollDocuments: null,
    logType         : "",
    logBy           : "",
    logAt           : new Date(),
}

export const AuditTable = "audits"
export const GetTable = "audits"
export const DeleteTable = "audits_delete"
export const DeleteAllTable = "audits_delete_all"
export const UpdateTable = "audits_update"

export const GroupTable = collections.GROUPS
export const CategoryTable = collections.CATEGORIES

export const UserId = "c85509ac-7373-464d-b667-425bb59b5738" // TODO: review/update

export const TestUserInfo: UserInfoType = {
    userId   : "c85509ac-7373-464d-b667-425bb59b5738",
    loginName: "abbeymart",
    email    : "abbeya1@yahoo.com",
    language : "en-US",
    firstname: "Abi",
    lastname : "Akindele",
    token    : "",
    expire   : 0,
}

export const CrudParamOptions: CrudOptionsType = {
    checkAccess  : false,
    auditColl    : "audits",
    userColl     : "users",
    serviceColl  : "services",
    accessColl   : "accesses",
    verifyColl   : "verify_users",
    roleColl     : "roles",
    logCrud      : true,
    logCreate    : true,
    logUpdate    : true,
    logDelete    : true,
    logRead      : true,
    logLogin     : false,
    logLogout    : false,
    maxQueryLimit: 10000,
    msgFrom      : "support@mconnect.biz",
    cacheResult  : false,
}

// TODO: create/update, get & delete records for groups & categories tables

export const LogRecords: ActionParamType = {
    "name"    : "Abi",
    "desc"    : "Testing only",
    "url"     : "localhost:9000",
    "priority": 100,
    "cost"    : 1000.00,
}

export const NewLogRecords: ActionParamType = {
    "name"    : "Abi Akindele",
    "desc"    : "Testing only - updated",
    "url"     : "localhost:9900",
    "priority": 1,
    "cost"    : 2000.00,
}

export const LogRecords2: ActionParamType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 10000.00,
}

export const NewLogRecords2: ActionParamType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2 - updated",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 20000.00,
}

// create record(s)

export const AuditCreateRec1: ActionParamType = {
    "tableName" : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": LogRecords,
    "logType"   : TaskTypes.CREATE,
}

export const AuditCreateRec2: ActionParamType = {
    "tableName" : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": LogRecords2,
    "logType"   : TaskTypes.CREATE,
}

export const AuditUpdateRec1: ActionParamType = {
    "id"           : "c1c3f614-b10d-40a4-9269-4e03f5fcf55e",
    "tableName"    : "todos",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords,
    "newLogRecords": NewLogRecords,
    "logType"      : TaskTypes.UPDATE,
}

export const AuditUpdateRec2: ActionParamType = {
    "id"           : "003c1422-c7cb-476f-b96f-9c8028e04a14",
    "tableName"    : "todos",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords2,
    "newLogRecords": NewLogRecords2,
    "logType"      : TaskTypes.UPDATE,
}

export const AuditCreateActionParams: ActionParamsType = [
    AuditCreateRec1,
    AuditCreateRec2,
]

export const AuditUpdateActionParams: ActionParamsType = [
    AuditUpdateRec1,
    AuditUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams

export const AuditUpdateRecordById: ActionParamType = {
    "id"           : "a345c33f-d9bf-47a4-aab5-3979528a0972",
    "tableName"    : "groups",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords,
    "newLogRecords": NewLogRecords,
    "logType"      : TaskTypes.DELETE,
}

export const AuditUpdateRecordByParam: ActionParamType = {
    "id"           : "d9cb7344-2c37-4492-9bf1-d6fa5ccc9634",
    "tableName"    : "contacts",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords,
    "newLogRecords": NewLogRecords,
    "logType"      : TaskTypes.UPDATE,
}

// GetIds: for get-records by ids & params | TODO: update ids after create

export const GetAuditById = "40afeaf8-abbb-43be-9c44-1642f393f0e9"
export const GetAuditByIds = ["40afeaf8-abbb-43be-9c44-1642f393f0e9",
    "5cd69f14-1945-400a-91fd-8ea6ca51cd64"] as Array<string>
export const GetAuditByParams: QueryParamsType = {
    "logType": "create",
}

export const DeleteAuditById = "d9cb7344-2c37-4492-9bf1-d6fa5ccc9634"
export const DeleteAuditByIds: Array<string> = [
    "40afeaf8-abbb-43be-9c44-1642f393f0e9",
    "3e56eb70-9fa1-4881-b8b4-11a114cb5673",
    "2cb32875-2268-4636-a2da-298611a19fd3",
    "7bedcf6d-d229-4553-9ff0-19011e7ac0ff",
]

export const DeleteAuditByParams: QueryParamsType = {
    "logType": "read",
}

export const UpdateAuditById = "d9cb7344-2c37-4492-9bf1-d6fa5ccc9634"
export const UpdateAuditByIds: Array<string> = [
    "d9cb7344-2c37-4492-9bf1-d6fa5ccc9634",
    "40afeaf8-abbb-43be-9c44-1642f393f0e9",
    "8d090d92-a916-4683-8619-4aa1484c6544",
]

export const UpdateAuditByParams: QueryParamsType = {
    "logType": "read",
}
