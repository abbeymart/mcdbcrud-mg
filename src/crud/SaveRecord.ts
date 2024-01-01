/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-24, 2023-11-23
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: save-record(s) (create/insert and update record(s))
 */

// Import required module/function(s)
import { ObjectId, UpdateResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { deleteHashCache, QueryHashCacheParamsType } from "@mconnect/mccache";
import { isEmptyObject, ModelOptionsType, RelationActionTypes } from "../orm";
import Crud from "./Crud";
import {
    ActionParamsType, ActionParamTaskType, CrudOptionsType, CrudParamsType, CrudResultType, LogDocumentsType, TaskTypes
} from "./types";

class SaveRecord extends Crud {
    protected modelOptions: ModelOptionsType;
    protected updateCascade: boolean;
    protected updateSetNull: boolean;
    protected updateSetDefault: boolean;

    constructor(params: CrudParamsType,
                options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
        this.modelOptions = options && options.modelOptions ? options.modelOptions : {
            timeStamp  : true,
            actorStamp : true,
            activeStamp: true,
        };
        this.updateCascade = false;
        this.updateSetNull = false;
        this.updateSetDefault = false;
    }

    async saveRecord(): Promise<ResponseMessage<any>> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }

        // determine update / create (new) items from actionParams
        await this.computeItems();
        // validate createItems and updateItems
        if (this.createItems.length > 0 && this.updateItems.length > 0) {
            return getResMessage("saveError", {
                message: "Only Create or Update tasks, not both, may be performed exclusively.",
                value  : {},
            });
        }
        if (this.createItems.length < 1 && this.updateItems.length < 1 && this.actionParams.length < 1) {
            return getResMessage("paramsError", {
                message: "Inputs errors (actionParams) to complete create or update tasks.",
                value  : {},
            });
        }
        // for queryParams, exclude _id, if present
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const {_id, ...otherParams} = this.queryParams;
            this.queryParams = otherParams;
        }

        // Ensure the _id and fields ending in Id for existParams are of type mongoDb-new ObjectId, for create / update actions
        if (this.existParams && this.existParams.length > 0) {
            this.existParams.forEach((item: any) => {
                // transform/cast id, from string, to mongoDB-new ObjectId
                Object.keys(item).forEach((itemKey: string) => {
                    if (itemKey.toString().toLowerCase().endsWith("id")) {
                        // create | TODO: review id-field length
                        if (typeof item[itemKey] === "string" && item[itemKey] !== "" &&
                            item[itemKey] !== null && item[itemKey].length <= 24) {
                            item[itemKey] = new ObjectId(item[itemKey]);
                        }
                        // update
                        if (typeof item[itemKey] === "object" && item[itemKey]["$ne"] &&
                            (item[itemKey]["$ne"] !== "" || item[itemKey]["$ne"] !== null)) {
                            item[itemKey]["$ne"] = new ObjectId(item[itemKey]["$ne"])
                        }
                    }
                });
            });
        }

        // create records/documents
        if (this.createItems.length > 0) {
            this.taskType = TaskTypes.CREATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist: ResponseMessage<any> = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // create records
                return await this.createRecord();
            } catch (e) {
                console.error(e);
                return getResMessage("insertError", {
                    message: "Error-inserting/creating new record.",
                });
            }
        }

        // update existing records/documents
        if (this.updateItems.length > 0) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                this.docIds = this.updateItems.map(it => it["_id"])
                // get current records for update-cascade and audit log
                this.updateCascade = this.childRelations.map(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("id");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecord();
            } catch (e) {
                console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/documents by queryParams: permitted for / restricted to admin-user/owner only (intentional)
        if (this.docIds.length < 1 && this.queryParams && !isEmptyObject(this.queryParams) &&
            this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
                this.updateCascade = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("queryparams");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordByParams();
            } catch (e) {
                console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/documents by docIds: permitted for / restricted to admin-user/owner only (intentional)
        if (this.docIds && this.docIds.length > 0 && this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
                this.updateCascade = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("id");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordById();
            } catch (e) {
                console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // return save-error message
        return getResMessage("saveError", {
            message: "Error performing the requested operation(s). Please retry",
        });
    }

    // helper methods:
    async computeItems(modelOptions: ModelOptionsType = this.modelOptions): Promise<ActionParamTaskType> {
        let updateItems: ActionParamsType = [],
            // docIds: Array<string> = [],
            createItems: ActionParamsType = [];
        // cases - actionParams.length === 1 OR > 1
        if (this.actionParams.length === 1) {
            let item = this.actionParams[0]
            if (!item["_id"]) {
                if (this.docIds.length > 0 || !isEmptyObject(this.queryParams)) {
                    // update existing record(s), by docIds or queryParams
                    if (modelOptions.actorStamp) {
                        item["updatedBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item["updatedAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && item.isActive === undefined) {
                        item["isActive"] = modelOptions.activeStamp;
                    }
                } else {
                    // create new record
                    // exclude any traces/presence of id, especially without concrete value ("", null, undefined)
                    const {_id, ...itemRec} = item;
                    if (modelOptions.actorStamp) {
                        itemRec["createdBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        itemRec["createdAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && itemRec.isActive === undefined) {
                        itemRec["isActive"] = modelOptions.activeStamp;
                    }
                    createItems.push(itemRec);
                }
            } else {
                // update existing document/record, by docId
                this.docIds = [];
                this.queryParams = {};
                if (modelOptions.actorStamp) {
                    item["updatedBy"] = this.userId;
                }
                if (modelOptions.timeStamp) {
                    item["updatedAt"] = new Date();
                }
                if (modelOptions.activeStamp && item.isActive === undefined) {
                    item["isActive"] = modelOptions.activeStamp;
                }
                updateItems.push(item);
                // docIds.push(item["_id"]);
            }
        } else if (this.actionParams.length > 1) {
            // multiple/batch creation or update of document/records
            this.docIds = [];
            this.queryParams = {};
            for (const item of this.actionParams) {
                if (item["_id"]) {
                    // update existing document/record
                    if (modelOptions.actorStamp) {
                        item["updatedBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item["updatedAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && item.isActive === undefined) {
                        item["isActive"] = modelOptions.activeStamp;
                    }
                    updateItems.push(item);
                    // docIds.push(item["_id"]);
                } else {
                    // create new document/record
                    // exclude any traces/presence of id, especially without concrete value ("", null, undefined)
                    const {_id, ...itemRec} = item;
                    if (modelOptions.actorStamp) {
                        itemRec["createdBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        itemRec["createdAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && itemRec.isActive === undefined) {
                        itemRec["isActive"] = modelOptions.activeStamp;
                    }
                    createItems.push(itemRec);
                }
            }
        }
        this.createItems = createItems;
        this.updateItems = updateItems;
        return {
            createItems,
            updateItems,
            docIds: this.docIds,
        };
    }

    async createRecord(): Promise<ResponseMessage<any>> {
        if (this.createItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to create new record(s), due to incomplete/incorrect input-parameters. ",
            });
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // insert/create record(s) and log in audit-collection
        try {
            const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
            const insertResult = await appDbColl.insertMany(this.createItems,);
            if (insertResult.insertedCount < 1 || !insertResult.acknowledged) {
                throw new Error(`Unable to create new record(s), database error [${insertResult.insertedCount} of ${this.createItems.length} set to be created]`)
            }
            // perform delete cache and audit-log tasks | TODO: update mccache package & usage
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.coll,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logCreate || this.logCrud) {
                const logDocuments: LogDocumentsType = {
                    logDocuments: this.createItems,
                }
                logRes = await this.transLog.createLog(this.coll, logDocuments, this.userId);
            }
            const resultValue: CrudResultType<any> = {
                recordsCount: insertResult.insertedCount,
                recordIds: Object.values(insertResult.insertedIds).map(it => it.toString()),
                logRes,
            }
            return getResMessage("success", {
                message: `Record(s) created successfully: ${insertResult.insertedCount} of ${this.createItems.length} items created.`,
                value  : resultValue,
            });
        } catch (e) {
            return getResMessage("insertError", {
                message: `Error inserting/creating new record(s): ${e.message ? e.message : ""}`,
            });
        }
    }

    async updateRecord(): Promise<ResponseMessage<any>> {
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        if (this.updateItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to update record(s), due to incomplete/incorrect input-parameters. ",
            });
        }
        // check/validate update/upsert command for multiple records
        try {
            let updateCount = 0;
            let updateMatchedCount = 0;
            // update one record
            if (this.updateItems.length === 1) {
                // destruct _id /other attributes
                const item: any = this.updateItems[0];
                const {
                    _id,
                    ...otherParams
                } = item;
                const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
                const updateResult = await appDbColl.updateOne({
                    _id: new ObjectId(_id),
                }, {
                    $set: otherParams,
                },);
                if (updateResult.modifiedCount < 1) {
                    throw new Error("No records updated. Please retry.")
                }
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount;
            }
            // update multiple records
            if (this.updateItems.length > 1) {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
                for await (const item of this.updateItems) {
                    // destruct _id /other attributes
                    const {
                        _id,
                        ...otherParams
                    } = item;
                    const updateResult = await appDbColl.updateOne({
                        _id: new ObjectId(_id as string),
                    }, {
                        $set: otherParams,
                    },);
                    if (updateResult.modifiedCount < 1) {
                        continue
                    }
                    updateCount += updateResult.modifiedCount;
                    updateMatchedCount += updateResult.matchedCount
                }
                if (updateCount < 1) {
                    throw new Error("No records updated. Please retry.")
                }
            }
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.coll,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logUpdate || this.logCrud) {
                const logDocuments: LogDocumentsType = {
                    logDocuments: this.currentRecs,
                }
                const newLogDocuments: LogDocumentsType = {
                    logDocuments: this.updateItems,
                }
                logRes = await this.transLog.updateLog(this.coll, logDocuments, newLogDocuments, this.userId);
            }
            const resultValue: CrudResultType<any> = {
                recordsCount: updateCount,
                logRes,
            }
            return getResMessage("success", {
                message: `Update completed - [${updateCount} of ${updateMatchedCount} updated].`,
                value  : resultValue,
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async updateRecordById(): Promise<ResponseMessage<any>> {
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        let updateResult: UpdateResult;
        try {
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...updateParams} = item;
            // include item stamps: userId and date
            updateParams.updatedBy = this.userId;
            updateParams.updatedAt = new Date();
            let updateCount = 0;
            let updateMatchedCount = 0;
            const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
            updateResult = await appDbColl.updateMany({_id: {$in: this.docIds.map(id => new ObjectId(id))}}, {
                $set: updateParams
            },) as UpdateResult;
            if (updateResult.modifiedCount < 1) {
                throw new Error(`Error updating document(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
            }
            updateCount += updateResult.modifiedCount;
            updateMatchedCount += updateResult.matchedCount
            if (updateCount < 1 || updateCount != updateMatchedCount) {
                throw new Error("No records updated. Please retry.")
            }
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.coll,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logUpdate || this.logCrud) {
                const logDocuments: LogDocumentsType = {
                    logDocuments: this.currentRecs,
                }
                const newLogDocuments: LogDocumentsType = {
                    queryParam: updateParams,
                }
                logRes = await this.transLog.updateLog(this.coll, logDocuments, newLogDocuments, this.userId);
            }
            const resultValue: CrudResultType<any> = {
                recordsCount: updateCount,
                logRes,
            }
            return getResMessage("success", {
                message: "Document updated completed successfully.",
                value  : resultValue,
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async updateRecordByParams(): Promise<ResponseMessage<any>> {
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        let updateResult: UpdateResult;
        try {
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...updateParams} = item;
            // include item stamps: userId and date
            updateParams.updatedBy = this.userId;
            updateParams.updatedAt = new Date();
            let updateCount = 0;
            let updateMatchedCount = 0;
            const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
            updateResult = await appDbColl.updateMany(this.queryParams, {
                $set: updateParams
            },) as UpdateResult;
            if (updateResult.modifiedCount < 1) {
                throw new Error(`Error updating document(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
            }
            updateCount += updateResult.modifiedCount;
            updateMatchedCount += updateResult.matchedCount
            if (updateCount < 1 || updateCount != updateMatchedCount) {
                throw new Error("No records updated. Please retry.")
            }
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.coll,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logUpdate || this.logCrud) {
                const logDocuments: LogDocumentsType = {
                    logDocuments: this.currentRecs,
                }
                const newLogDocuments: LogDocumentsType = {
                    queryParam: updateParams,
                }
                logRes = await this.transLog.updateLog(this.coll, logDocuments, newLogDocuments, this.userId);
            }
            const resultValue: CrudResultType<any> = {
                recordsCount: updateCount,
                logRes,
            }
            return getResMessage("success", {
                message: "Document updated completed successfully.",
                value  : resultValue,
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }
}

// factory function/constructor
function newSaveRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new SaveRecord(params, options);
}

export { SaveRecord, newSaveRecord };
