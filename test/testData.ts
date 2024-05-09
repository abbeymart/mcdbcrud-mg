// @Description: test-cases data: for get, delete and save record(s)

import {
    UserInfoType, CrudOptionsType, ActionParamType,
    TaskTypes, QueryParamsType, ActionParamsType, ModelRelationType, RelationTypes, RelationActionTypes, ModelDescType,
    BaseModel, DataTypes, ModelCrudOptionsType, newModel, AuditType,
} from "../src"
import { collections } from "./collections";

// Models

// TODO: include groups and categories collections, with relations-specs

export const groupModel: ModelDescType = {
    tableName  : collections.GROUPS,
    recordDesc : {
        ...BaseModel,
        name     : {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        iconStyle: DataTypes.STRING,
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}

export const categoryModel: ModelDescType = {
    tableName  : collections.CATEGORIES,
    recordDesc : {
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
            fieldType   : DataTypes.NUMBER,
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
        sourceTable : collections.GROUPS,
        targetTable : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "groupId",
        sourceModel : groupModel,
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
    {
        sourceTable : collections.GROUPS,
        targetTable : collections.CATEGORIES,
        sourceField : "name",
        targetField : "groupName",
        sourceModel : groupModel,
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupName",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.CASCADE,
    },
];

export const categoryRelations: Array<ModelRelationType> = [
    {
        sourceTable : collections.CATEGORIES,
        targetTable : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "parentId",
        sourceModel: categoryModel,
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


export const AuditModel: AuditType = {
    _id          : "",
    tableName    : "",
    logRecords   : {},
    newLogRecords: {},
    logType      : "",
    logBy        : "",
    logAt        : new Date(),
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
    email    : "abbeymart@yahoo.com",
    language : "en-US",
    firstname: "Abi",
    lastname : "Akindele",
    token    : "",
    expire   : 0,
}

export const CrudParamOptions: CrudOptionsType = {
    checkAccess  : false,
    auditTable   : "audits",
    userTable    : "users",
    serviceTable : "services",
    accessTable  : "accesses",
    verifyTable  : "verify_users",
    roleTable    : "roles",
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
    "tableName"    : "audits",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "collDocuments": LogRecords,
    "logType"      : TaskTypes.CREATE,
}

export const AuditCreateRec2: ActionParamType = {
    "tableName"    : "audits",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "collDocuments": LogRecords2,
    "logType"      : TaskTypes.CREATE,
}

export const AuditUpdateRec1: ActionParamType = {
    "_id"             : "638fd565c97d023503c6a0d8",
    "tableName"       : "todos",
    "logAt"           : new Date(),
    "logBy"           : UserId,
    "collDocuments"   : LogRecords,
    "newCollDocuments": NewLogRecords,
    "logType"         : TaskTypes.UPDATE,
}

export const AuditUpdateRec2: ActionParamType = {
    "_id"             : "638fd565c97d023503c6a0d9",
    "tableName"       : "todos",
    "logAt"           : new Date(),
    "logBy"           : UserId,
    "collDocuments"   : LogRecords2,
    "newCollDocuments": NewLogRecords2,
    "logType"         : TaskTypes.UPDATE,
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
    // "_id"              : "638fd565c97d023503c6a0db",
    "tableName"       : "groups",
    "logAt"           : new Date(),
    "logBy"           : UserId,
    "collDocuments"   : LogRecords,
    "newCollDocuments": NewLogRecords,
    "logType"         : TaskTypes.DELETE,
}

export const AuditUpdateRecordByParam: ActionParamType = {
    // "_id"              : "638fd565c97d023503c6a0dc",
    "tableName"       : "contacts",
    "logAt"           : new Date(),
    "logBy"           : UserId,
    "collDocuments"   : LogRecords,
    "newCollDocuments": NewLogRecords,
    "logType"         : TaskTypes.UPDATE,
}

// GetIds: for get-records by ids & params

export const GetAuditById = "638fd565c97d023503c6a0d8"
export const GetAuditByIds = ["638fd565c97d023503c6a0d8",
    "638fd565c97d023503c6a0d9"] as Array<string>
export const GetAuditByParams: QueryParamsType = {
    "logType": "create",
}

export const DeleteAuditById = "638fd565c97d023503c6a0d8"
export const DeleteAuditByIds: Array<string> = [
    "638fd565c97d023503c6a0dc",
    "638fd565c97d023503c6a0dd",
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
]

export const DeleteAuditByParams: QueryParamsType = {
    "logType": "read",
}

export const UpdateAuditById = "638fd565c97d023503c6a0d8"
export const UpdateAuditByIds: Array<string> = [
    "638fd565c97d023503c6a0d8",
    "638fd565c97d023503c6a0d9",
    "638fd565c97d023503c6a0da",
]

export const UpdateAuditByParams: QueryParamsType = {
    "logType": "read",
}
