/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-25
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mc-orm types
 */

import { FieldValueTypes } from "../crud";

export enum DataTypes {
    STRING = "string",
    POSTAL_CODE = "postalcode",
    MONGODB_ID = "objectId",
    UUID = "uuid",
    NUMBER = "number",
    INTEGER = "integer",
    DECIMAL = "decimal",
    FLOAT = "float",
    BIGINT = "bigint",
    BIGFLOAT = "bigfloat",
    OBJECT = "object",  // key-value pairs
    ARRAY = "array",
    ARRAY_STRING = "arrayofstring",
    ARRAY_NUMBER = "arrayofnumber",
    ARRAY_BOOLEAN = "arrayofboolean",
    ARRAY_OBJECT = "arrayofobject",
    BOOLEAN = "boolean",
    JSON = "json",
    DATETIME = "datetime",
    TIMESTAMP = "timestamp",
    TIMESTAMPZ = "timestampz",
    POSITIVE = "positive",
    EMAIL = "email",
    URL = "url",
    PORT = "port",
    IP = "ipaddress",
    JWT = "jwt",
    LAT_LONG = "latlong",
    ISO2 = "iso2",
    ISO3 = "iso3",
    MAC_ADDRESS = "macaddress",
    MIME = "mime",
    CREDIT_CARD = "creditcard",
    CURRENCY = "currency",
    IMEI = "imei",
    ENUM = "enum",
    SET = "set",
    MAP = "map",    // Table/Map/Dictionary
    MCDB_HANDLE = "mcdbhandle",  // Database connection handle
    MCDB_CLIENT = "mcdbclient", // Database connection client
    MODEL = "model",    // Model record definition
    UNKNOWN = "unknown",
}

export enum RelationTypes {
    ONE_TO_ONE = "onetoone",
    ONE_TO_MANY = "onetomany",
    MANY_TO_MANY = "manytomany",
    MANY_TO_ONE = "manytoone",
}

export enum RelationActionTypes {
    RESTRICT = "restrict",  // must remove target-record(s), prior to removing source-record
    CASCADE = "cascade",    // default for ON UPDATE | update foreignKey value or delete foreignKey record/value
    NO_ACTION = "noaction", // leave the foreignKey value, as-is
    SET_DEFAULT = "setdefault", // set foreignKey to specified default value
    SET_NULL = "setnull",   // set foreignKey value to null or ""
}

// ModelValue will be validated based on the Model definition
export interface ValueParamsType {
    [key: string]: FieldValueTypes; // fieldName: fieldValue, must match fieldType (re: validate) in model definition
}

export interface DocValueType {
    [key: string]: ValueParamsType;
}

export interface ValueToDataTypes {
    [key: string]: DataTypes;
}

export type GetValueType = (<T>() => T);
export type SetValueType = (<T>(fieldValue: T) => T);   // receive docValue-object as parameter
export type DefaultValueType = (<T, R>(fieldValue?: T) => R);   // may/optionally receive fieldValue as parameter
export type ValidateMethodType = (<T>(docValue?: T) => boolean);    // may/optionally receive docValue-object as parameter
export type ValidateMethodResponseType = (<T>(docValue: T) => ValidateResponseType) | undefined;  // receive docValue-object as parameter
export type ComputedValueType = (<T, R>(docValue: T) => R); // receive docValue-object as parameter

export interface ValidateMethodsType {
    [key: string]: ValidateMethodResponseType;
}

export interface ComputedMethodsType {
    [key: string]: ComputedValueType;
}

// for field and model methods: docValue may be auto-injected, as a closure,
// to be checked and used internally by the method/func
export interface FieldDescType {
    fieldType: DataTypes;
    fieldLength?: number;   // default: 255 for DataTypes.STRING
    fieldPattern?: string;  // "/^[0-9]{10}$/" => includes 10 digits, 0 to 9 | "/^[0-9]{6}.[0-9]{2}$/ => max 16 digits and 2 decimal places
    startsWith?: string;
    endsWith?: string;
    notStartsWith?: string;
    notEndsWith?: string;
    includes?: string;
    excludes?: string;
    allowNull?: boolean;    // default: true
    unique?: boolean;
    indexable?: boolean;
    primaryKey?: boolean;
    minValue?: number | Date | string;
    maxValue?: number | Date | string;
    setValue?: SetValueType;    // set/transform fieldValue prior to save(create/insert), T=>fieldType
    defaultValue?: DefaultValueType | FieldValueTypes;  // result/T must be of fieldType
    validate?: ValidateMethodType;  // T=>fieldType, returns a bool (valid=true/invalid=false)
    validateMessage?: string;
    comments?: string;
}

export interface ModelRelationType {
    sourceTable: string;
    targetTable: string;
    sourceField: string;
    targetField: string;
    relationType: RelationTypes;
    sourceModel: ModelDescType;
    targetModel: ModelDescType;
    foreignField?: string;  // source-to-targetField map
    relationField?: string; // relation-targetField, for many-to-many
    relationTable?: string;  // optional tableName for many-to-many | default: sourceTarget or source_target
    onDelete?: RelationActionTypes;
    onUpdate?: RelationActionTypes;
}

export interface RecordDescType {
    [key: string]: DataTypes | FieldDescType | ModelDescType;       // TODO: ModelDescType case-handling - optional
}

export const BaseModel: RecordDescType = {
    _id        : DataTypes.MONGODB_ID,
    language   : {
        fieldType   : DataTypes.STRING,
        fieldLength : 12,
        allowNull   : false,
        defaultValue: "en-US",
    },
    description: DataTypes.STRING,
    isActive   : {
        fieldType   : DataTypes.BOOLEAN,
        allowNull   : false,
        defaultValue: true,
    },
    createdBy  : DataTypes.STRING,
    updatedBy  : DataTypes.STRING,
    createdAt  : {
        fieldType   : DataTypes.DATETIME,
        defaultValue: new Date(), // new Date().toString(),
    },
    updatedAt  : {
        fieldType   : DataTypes.DATETIME,
        defaultValue: new Date(),
    },
    deletedAt  : DataTypes.STRING,
    appId      : {
        fieldType: DataTypes.STRING,
        allowNull: true,
        comments : "application-id in a multi-hosted apps environment (e.g. cloud-env)",
    },
}

export interface ModelDescType {
    tableName: string;
    recordDesc: RecordDescType;
    timeStamp?: boolean;    // auto-add: createdAt and updatedAt | default: true
    actorStamp?: boolean;   // auto-add: createdBy and updatedBy | default: true
    activeStamp?: boolean;  // record active status, isActive (true | false) | default: true
    computedMethods?: ComputedMethodsType;  // model-level functions, e.g fullName(a, b: T): T
    validateMethod?: ValidateMethodResponseType;
    alterSyncTable?: boolean;    // create / alter table / collection and sync existing data, if there was a change to the Coll structure | default: true
    // if alterSyncColl: false; it will create/re-create the Coll, with no data sync
}

export interface ModelOptionsType {
    timeStamp?: boolean;        // auto-add: createdAt and updatedAt | default: true
    actorStamp?: boolean;       // auto-add: createdBy and updatedBy | default: true
    activeStamp?: boolean;      // auto-add isActive, if not already set | default: true
    docValueDesc?: RecordDescType;
    docValue?: ValueParamsType;
}

export type UniqueFieldsType = Array<Array<string>>;

export interface ModelCrudOptionsType extends ModelOptionsType {
    relations?: Array<ModelRelationType>;   // for ref-integrity
    uniqueFields?: UniqueFieldsType;        // composite unique-fields
    primaryFields?: Array<string>;          // composite primary-fields
    requiredFields?: Array<string>;         // may be computed from FieldDesc allowNull attributes
}

export interface ErrorType {
    [key: string]: string;
}

export interface MessageObject {
    [key: string]: string;
}

export interface ValidateResponseType {
    ok: boolean;
    errors: MessageObject;
}
