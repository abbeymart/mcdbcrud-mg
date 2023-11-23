/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-02-21 | @Updated: 2020-05-28, 2023-11-22
 * @Company: mConnect.biz | @License: MIT
 * @Description: mcdbcrud-mg base class, for all CRUD operations
 */

// Import required module/function(s)/types
import {Db, MongoClient, ObjectId} from "mongodb";
import {getResMessage, ResponseMessage} from "@mconnect/mcresponse";
import {
    CrudParamsType,
    CrudOptionsType,
    TaskTypes,
    QueryParamsType,
    ActionParamsType,
    ProjectParamsType, SortParamsType, SubItemsType, ObjectRefType,
    ActionExistParamsType,
} from "./types";
import {AuditLog, newAuditLog} from "../auditlog";
import { ModelRelationType} from "../orm";

export class Crud {
    protected params: CrudParamsType;
    protected readonly appDb: Db;
    protected readonly coll: string;
    protected readonly dbClient: MongoClient;
    protected readonly dbName: string;
    protected docIds: Array<string>;       // to capture string-id | ObjectId
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
    protected readonly auditColl: string;
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
    protected currentRecs: Array<ObjectRefType>;
    protected isRecExist: boolean;
    protected actionAuthorized: boolean;
    protected recExistMessage: string;
    protected unAuthorizedMessage: string;
    protected subItems: Array<SubItemsType>;
    protected cacheExpire: number;
    protected readonly parentColls: Array<string>;
    protected readonly childColls: Array<string>;
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
        this.coll = params.coll;
        this.dbClient = params.dbClient;
        this.dbName = params.dbName;
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.queryParams = params && params.queryParams ? params.queryParams : {};
        this.existParams = params && params.existParams ? params.existParams : [];
        this.projectParams = params && params.projectParams ? params.projectParams : {};
        this.sortParams = params && params.sortParams ? params.sortParams : {};
        this.taskType = params && params.taskType ? params.taskType : "";
        this.docIds = params && params.docIds ? params.docIds : [];
        // options
        this.userId = options?.userId? options.userId : 'not-specified';
        this.skip = params.skip ? params.skip : options?.skip ? options.skip : 0;
        this.limit = params.limit ? params.limit : options?.limit ? options.limit : 10000;
        this.parentColls = options?.parentColls ? options.parentColls : [];
        this.childColls = options?.childColls ? options.childColls : [];
        this.parentRelations = options?.parentRelations ? options.parentRelations : [];
        this.childRelations = options?.childRelations ? options.childRelations : [];
        this.recursiveDelete = options?.recursiveDelete !== undefined ? options.recursiveDelete : false;
        this.checkAccess = options?.checkAccess !== undefined ? options.checkAccess : false;
        this.auditColl = options?.auditColl ? options.auditColl : "audits";
        this.auditDb = options?.auditDb ? options.auditDb : this.appDb;
        this.auditDbClient = options?.auditDbClient ? options.auditDbClient : this.dbClient;
        this.auditDbName = options?.auditDbName ? options.auditDbName : this.dbName;
        this.maxQueryLimit = options?.maxQueryLimit ? options.maxQueryLimit : 10000;
        this.logCrud = options?.logCrud !== undefined ? options.logCrud : false;
        this.logCreate = options?.logCreate !== undefined ? options.logCreate : false;
        this.logUpdate = options?.logUpdate !== undefined ? options.logUpdate : false;
        this.logRead = options?.logRead !== undefined ? options.logRead : false;
        this.logDelete = options?.logDelete !== undefined ? options.logDelete : false;
        this.logLogin = options?.logLogin !== undefined ? options.logLogin : false;
        this.logLogout = options?.logLogout !== undefined ? options.logLogout : false;
        this.cacheExpire = options?.cacheExpire ? options.cacheExpire : 300;
        // unique cache-key
        this.cacheKey = JSON.stringify({
            dbName       : this.dbName,
            coll         : this.coll,
            queryParams  : this.queryParams,
            projectParams: this.projectParams,
            sortParams   : this.sortParams,
            docIds       : this.docIds,
            skip         : this.skip,
            limit        : this.limit,
        });
        // auditLog constructor / instance
        this.transLog = newAuditLog(this.auditDb, {
            auditColl: this.auditColl,
        });
        // standard defaults
        this.isAdmin = false;
        this.isActive = true;
        this.createItems = [];
        this.updateItems = [];
        this.currentRecs = [];
        this.subItems = [];
        this.isRecExist = true;
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
        this.cacheResult = options?.cacheResult ? options.cacheResult : false;
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
    async checkRecExist(): Promise<ResponseMessage> {
        try {
            // check if existParams condition is specified
            if (this.existParams.length < 1) {
                return getResMessage("success", {
                    message: "No data integrity condition specified",
                });
            }
            // check record existence/uniqueness for the documents/actionParams
            const appDbColl = this.appDb.collection(this.coll);
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
                    message: "No data integrity conflict",
                });
            }
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {
                message: "Unable to verify data integrity conflict",
            });
        }
    }

    // getCurrentRecords fetch documents by docIds, queryParams or all limited by this.limit and this.skip, if applicable
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
                    const docIds = this.docIds.map(id => new ObjectId(id));
                    currentRecords = await this.appDb.collection(this.coll)
                        .find({_id: {$in: docIds}},)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
                case "queryparams":
                    currentRecords = await this.appDb.collection(this.coll)
                        .find(this.queryParams,)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
                default:
                    currentRecords = await this.appDb.collection(this.coll)
                        .find({},)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
            }
            if (by.toLowerCase() === "id") {
                if (currentRecords.length > 0 && currentRecords.length === this.docIds.length) {
                    // update crud instance current-records value
                    this.currentRecs = currentRecords;
                    return getResMessage("success", {
                        message: `${currentRecords.length} document/record(s) retrieved successfully.`,
                        value  : currentRecords,
                    });
                } else if (currentRecords.length > 0 && currentRecords.length < this.docIds.length) {
                    return getResMessage("partialRecords", {
                        message: `${currentRecords.length} out of ${this.docIds.length} document/record(s) found`,
                        value  : currentRecords,
                    });
                } else {
                    return getResMessage("notFound", {
                        message: "Document/record(s) not found.",
                        value  : currentRecords,
                    });
                }
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

}

export default Crud;
