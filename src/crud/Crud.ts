/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-02-21 | @Updated: 2020-05-28, 2023-11-22, 2024-01-06
 * @Company: mConnect.biz | @License: MIT
 * @Description: mcdbcrud-mg base class, for all CRUD operations
 */

// Import required module/function(s)/types
import { Db, MongoClient, ObjectId } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import {
    CrudParamsType, CrudOptionsType, TaskTypes, QueryParamsType, ActionParamsType,
    ProjectParamsType, SortParamsType, SubItemsType, ActionExistParamsType, FieldValueTypes,
    ActionParamType,
} from "./types";
import { AuditLog, newAuditLog } from "../auditlog";
import { DataTypes, DefaultValueType, FieldDescType, ModelRelationType, RecordDescType, } from "../orm";


export class Crud {
    protected params: CrudParamsType;
    protected readonly appDb: Db;
    protected readonly tableName: string;
    protected readonly dbClient: MongoClient;
    protected readonly dbName: string;
    protected recordIds: Array<string>;       // to capture string-id | ObjectId
    protected actionParams: ActionParamsType;
    protected queryParams: QueryParamsType;
    protected readonly existParams: ActionExistParamsType;
    protected readonly projectParams: ProjectParamsType;
    protected readonly sortParams: SortParamsType | {};
    protected taskType: TaskTypes | string;
    protected skip: number;
    protected limit: number;
    protected readonly recursiveDelete: boolean;
    protected readonly auditDb: Db;
    protected readonly auditDbClient: MongoClient;
    protected readonly auditDbName: string;
    protected readonly auditTable: string;
    protected maxQueryLimit: number;
    protected readonly logCrud: boolean;
    protected readonly logCreate: boolean;
    protected readonly logUpdate: boolean;
    protected readonly logRead: boolean;
    protected readonly logDelete: boolean;
    protected readonly logLogin: boolean;
    protected readonly logLogout: boolean;
    protected transLog: AuditLog;
    protected cacheKey: string;
    protected readonly checkAccess: boolean;
    protected userId: string;
    protected isAdmin: boolean;
    protected isActive: boolean;
    protected createItems: ActionParamsType;
    protected updateItems: ActionParamsType;
    protected currentRecs: Array<ActionParamType>;
    protected isRecExist: boolean;
    protected actionAuthorized: boolean;
    protected recExistMessage: string;
    protected unAuthorizedMessage: string;
    protected subItems: Array<SubItemsType>;
    protected cacheExpire: number;
    protected readonly parentTables: Array<string>;
    protected readonly childTables: Array<string>;
    protected readonly parentRelations: Array<ModelRelationType>;
    protected readonly childRelations: Array<ModelRelationType>;
    protected readonly queryFieldType: string;
    protected readonly appDbs: Array<string>;
    protected readonly appTables: Array<string>;
    protected readonly cacheResult: boolean;
    protected getAllResults?: boolean;

    constructor(params: CrudParamsType, options?: CrudOptionsType) {
        // crudParams
        this.params = params;
        this.appDb = params.appDb;
        this.tableName = params.tableName;
        this.dbClient = params.dbClient;
        this.dbName = params.dbName;
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.queryParams = params && params.queryParams ? params.queryParams : {};
        this.existParams = params && params.existParams ? params.existParams : [];
        this.projectParams = params && params.projectParams ? params.projectParams : {};
        this.sortParams = params && params.sortParams ? params.sortParams : {};
        this.taskType = params && params.taskType ? params.taskType : "";
        this.recordIds = params && params.recordIds ? params.recordIds : [];
        // options
        this.userId = params.userInfo?.userId ? params.userInfo.userId :
            options?.userId ? options.userId : 'not-specified';
        this.skip = params.skip ? params.skip : options?.skip ? options.skip : 0;
        this.limit = params.limit ? params.limit : options?.limit ? options.limit : 10000;
        this.parentTables = options?.parentTables ? options.parentTables : [];
        this.childTables = options?.childTables ? options.childTables : [];
        this.parentRelations = options?.parentRelations ? options.parentRelations : [];
        this.childRelations = options?.childRelations ? options.childRelations : [];
        this.recursiveDelete = options?.recursiveDelete? options.recursiveDelete : false;
        this.checkAccess = options?.checkAccess? options.checkAccess : false;
        this.auditTable = options?.auditTable ? options.auditTable : "audits";
        this.auditDb = options?.auditDb ? options.auditDb : this.appDb;
        this.auditDbClient = options?.auditDbClient ? options.auditDbClient : this.dbClient;
        this.auditDbName = options?.auditDbName ? options.auditDbName : this.dbName;
        this.maxQueryLimit = options?.maxQueryLimit ? options.maxQueryLimit : 10000;
        this.logCrud = options?.logCrud? options.logCrud : false;
        this.logCreate = options?.logCreate? options.logCreate : false;
        this.logUpdate = options?.logUpdate? options.logUpdate : false;
        this.logRead = options?.logRead? options.logRead : false;
        this.logDelete = options?.logDelete? options.logDelete : false;
        this.logLogin = options?.logLogin? options.logLogin : false;
        this.logLogout = options?.logLogout? options.logLogout : false;
        this.cacheExpire = options?.cacheExpire ? options.cacheExpire : 300;
        // unique cache-key
        this.cacheKey = JSON.stringify({
            dbName       : this.dbName,
            tableName    : this.tableName,
            queryParams  : this.queryParams,
            projectParams: this.projectParams,
            sortParams   : this.sortParams,
            recordIds    : this.recordIds,
            skip         : this.skip,
            limit        : this.limit,
        });
        // auditLog constructor / instance
        this.transLog = newAuditLog(this.auditDb, {
            auditTable: this.auditTable,
        });
        // standard defaults
        this.isAdmin = false;
        this.isActive = true;
        this.createItems = [];
        this.updateItems = [];
        this.currentRecs = [];
        this.subItems = [];
        this.isRecExist = false;
        this.actionAuthorized = false;
        this.recExistMessage = "Save / update error or duplicate documents exist. ";
        this.unAuthorizedMessage = "Action / task not authorised or permitted. ";
        this.queryFieldType = options?.queryFieldType ? options.queryFieldType : "underscore";
        this.appDbs = options?.appDbs ? options.appDbs :
            ["database", "database-mcpa", "database-mcpay", "database-mcship", "database-mctrade",
                "database-mcproperty", "database-mcinfo", "database-mcbc", "database-mcproject",];
        this.appTables = options?.appTables ? options.appTables :
            ["table", "table-mcpa", "table-mcpay", "table-mcship", "table-mctrade", "table-mcproperty",
                "table-mcinfo", "table-mcbc", "table-mcproject",];
        this.cacheResult = options?.cacheResult? options.cacheResult : false;
        this.getAllResults = options?.getAllRecords || false;
    }

    // checkDb checks / validate appDb
    checkDb(dbConnect: Db): ResponseMessage {
        if (dbConnect && dbConnect.databaseName !== "") {
            return getResMessage("success", {
                message: "valid database handler",
            });
        } else {
            return getResMessage("validateError", {
                message: "valid database handler is required",
            });
        }
    }

    // checkDbClient checks / validates mongo-client connection (for crud-transactional tasks)
    checkDbClient(dbc: MongoClient): ResponseMessage {
        if (dbc) {
            return getResMessage("success", {
                message: "valid database-server client connection",
            });
        } else {
            return getResMessage("validateError", {
                message: "valid database-server client connection is required",
            });
        }
    }

    // checkRecExist method checks if items/documents exist: document uniqueness
    async noRecordDuplication(): Promise<ResponseMessage> {
        try {
            // check if existParams condition is specified
            if (this.existParams.length < 1) {
                return getResMessage("success", {
                    message: "No data integrity condition specified",
                });
            }
            // check record existence/uniqueness for the record/actionParams
            const appDbColl = this.appDb.collection(this.tableName);
            let attributesMessage = "";
            for (const actionExistParams of this.existParams) {
                for (const existItem of actionExistParams) {
                    let recordExist = await appDbColl.findOne(existItem);
                    if (recordExist) {
                        this.isRecExist = true;
                        // capture attributes for any duplicate-document
                        Object.entries(existItem)
                            .forEach(([key, value]) => {
                                attributesMessage = attributesMessage ? `${attributesMessage} | ${key}: ${value}` :
                                    `${key}: ${value}`;
                            });
                        // if a duplicate-document was found, break the inner-for-loop
                        break;
                    } else {
                        this.isRecExist = false;
                    }
                }
                // if a duplicate-document was found, break the outer-for-loop
                if (this.isRecExist) {
                    break;
                }
            }
            if (this.isRecExist) {
                return getResMessage("recExist", {
                    message: `Document/Record with similar combined attributes [${attributesMessage}] exists. Provide unique record attributes to create or update record(s).`,
                });
            } else {
                return getResMessage("success", {
                    message: "No data integrity (duplication) conflict",
                });
            }
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {
                message: "Unable to verify data integrity (duplication) conflict",
            });
        }
    }

    // getCurrentRecords fetch documents by recordIds, queryParams or all limited by this.limit and this.skip, if applicable
    async getCurrentRecords(by = ""): Promise<ResponseMessage> {
        try {
            // validate models
            const validDb = this.checkDb(this.appDb);
            if (validDb.code !== "success") {
                return validDb;
            }
            let currentRecords: ActionParamsType;
            switch (by.toLowerCase()) {
                case "id":
                    const recordIds = this.recordIds.map(id => new ObjectId(id));
                    currentRecords = await this.appDb.collection(this.tableName)
                        .find({_id: {$in: recordIds}},)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    if (currentRecords.length > 0 && currentRecords.length === this.recordIds.length) {
                        // update crud instance current-records value
                        this.currentRecs = currentRecords;
                        return getResMessage("success", {
                            message: `${currentRecords.length} document/record(s) retrieved successfully.`,
                            value  : currentRecords,
                        });
                    } else if (currentRecords.length > 0 && currentRecords.length < this.recordIds.length) {
                        return getResMessage("partialRecords", {
                            message: `${currentRecords.length} out of ${this.recordIds.length} document/record(s) found`,
                            value  : currentRecords,
                        });
                    } else {
                        return getResMessage("notFound", {
                            message: "Document/record(s) not found.",
                            value  : currentRecords,
                        });
                    }
                case "queryparams":
                    currentRecords = await this.appDb.collection(this.tableName)
                        .find(this.queryParams,)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
                default:
                    currentRecords = await this.appDb.collection(this.tableName)
                        .find({},)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
            }
            // response for by queryParams or all-documents
            if (currentRecords.length > 0) {
                // update crud instance current-records value
                this.currentRecs = currentRecords;
                return getResMessage("success", {
                    message: `${currentRecords.length} document/record(s) retrieved successfully.`,
                    value  : currentRecords,
                });
            } else {
                return getResMessage("notFound", {
                    message: "Document/record(s) not found.",
                    value  : currentRecords,
                });
            }
        } catch (e) {
            console.error(e);
            return getResMessage("notFound", {
                message: "Error retrieving current document/record(s)",
            });
        }
    }

    // set null value by DataTypes
    initializeFieldValue(fieldTypeDesc: DataTypes): any {
        switch (fieldTypeDesc) {
            case DataTypes.STRING:
            case DataTypes.POSTAL_CODE:
            case DataTypes.MONGODB_ID:
            case DataTypes.UUID:
            case DataTypes.EMAIL:
            case DataTypes.PORT:
            case DataTypes.URL:
            case DataTypes.JWT:
            case DataTypes.MAC_ADDRESS:
            case DataTypes.ISO2:
            case DataTypes.ISO3:
            case DataTypes.LAT_LONG:
            case DataTypes.MIME:
            case DataTypes.CREDIT_CARD:
            case DataTypes.CURRENCY:
            case DataTypes.IMEI:
                return "";
            case DataTypes.INTEGER:
            case DataTypes.POSITIVE:
            case DataTypes.BIGINT:
                return 0;
            case DataTypes.NUMBER:
            case DataTypes.DECIMAL:
            case DataTypes.FLOAT:
            case DataTypes.BIGFLOAT:
                return 0.00;
            case DataTypes.ARRAY:
            case DataTypes.ARRAY_NUMBER:
            case DataTypes.ARRAY_STRING:
            case DataTypes.ARRAY_OBJECT:
            case DataTypes.ARRAY_BOOLEAN:
            case DataTypes.ENUM:
                return [];
            case DataTypes.OBJECT:
            case DataTypes.JSON:
            case DataTypes.MAP:
                return {};
            case DataTypes.BOOLEAN:
                return false;
            case DataTypes.DATETIME:
            case DataTypes.TIMESTAMP:
            case DataTypes.TIMESTAMPZ:
                return new Date("01-01-1970");
            case DataTypes.IP:
                return "0.0.0.0";
            default:
                return null;
        }
    }

    // set default value based on FieldDescType
    async setDefault(defaultValue: FieldValueTypes | DefaultValueType, fieldValue: FieldValueTypes = null): Promise<any> {
        try {
            switch (typeof defaultValue) {
                // defaultValue may be of types: DefaultValueType(function) or FieldValueTypes(regular-values)
                case "function":
                    const defValue = defaultValue as DefaultValueType;
                    return await defValue(fieldValue);
                default:
                    return defaultValue || null;
            }
        } catch (e) {
            return null
        }
    }

    // computeInitializeValues set the null values for document/actionParam, for allowNull(true)
    computeInitializeValues(recordDesc: RecordDescType): ActionParamType {
        let nullValues: ActionParamType = {}
        for (let [field, fieldDesc] of Object.entries(recordDesc)) {
            switch (typeof fieldDesc) {
                case "string":
                    fieldDesc = fieldDesc as DataTypes
                    // allowNull = true
                    // set null value for DataTypes
                    nullValues[field] = this.initializeFieldValue(fieldDesc);
                    break;
                case "object":
                    fieldDesc = fieldDesc as FieldDescType
                    // if !allowNull, skip setting null value
                    if (Object.keys(fieldDesc).includes("allowNull") && !fieldDesc.allowNull) {
                        continue;
                    }
                    // set null value for DataTypes
                    nullValues[field] = this.initializeFieldValue(fieldDesc.fieldType);
                    break;
            }
        }
        return nullValues;
    }

    async computeRecordDefaultValues(recordDesc: RecordDescType, recordValue: ActionParamType): Promise<ActionParamType> {
        let defaultValues: ActionParamType = {};
        for (let [field, fieldDesc] of Object.entries(recordDesc)) {
            const fieldValue = recordValue[field] || null
            switch (typeof fieldDesc) {
                case "string":
                    fieldDesc = fieldDesc as DataTypes
                    // set default-value to the null-value for the DataTypes
                    defaultValues[field] = this.initializeFieldValue(fieldDesc);
                    break;
                case "object":
                    fieldDesc = fieldDesc as FieldDescType
                    // if !defaultValue, skip setting default value
                    if (!fieldDesc.defaultValue) {
                        continue;
                    }
                    // set default value for FieldDescType
                    defaultValues[field] = await this.setDefault(fieldDesc.defaultValue, fieldValue);
                    break;
                default:
                    break;
            }
        }
        return defaultValues;
    }

}

export default Crud;
