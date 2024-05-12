/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-24, 2023-11-23, 2024-01-06
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: save-record(s) (create/insert and update record(s))
 */

// Import required module/function(s)
import { ObjectId, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { deleteHashCache, QueryHashCacheParamsType } from "@mconnect/mccache";
import { ModelOptionsType, RelationActionTypes } from "../orm";
import { isEmptyObject } from "./utils";
import Crud from "./Crud";
import {
    ActionParamsType, ActionParamTaskType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, TaskTypes
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

    async saveRecord(): Promise<ResponseMessage> {
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
                message: "Valid actionParams parameter is required to complete create or update tasks.",
                value  : {},
            });
        }
        // for queryParams, exclude _id, if present
        // if (this.queryParams && !isEmptyObject(this.queryParams)) {
        //     const {_id, ...otherParams} = this.queryParams;
        //     this.queryParams = otherParams;
        // }
        // create records/documents
        if (this.createItems.length > 0) {
            this.taskType = TaskTypes.CREATE
            try {
                // check duplicate records, i.e. if similar records exist
                // compute existParams for create task
                this.existParams = this.computeExistParams(this.createItems)
                if (this.existParams.length > 0 && this.existParams[0].length > 0) {
                    const noDuplication = await this.noRecordDuplication(this.createItems);
                    if (noDuplication.code !== "success") {
                        return noDuplication;
                    }
                }
                // create records
                return await this.createRecord();
            } catch (e) {
                return getResMessage("insertError", {
                    message: `Error-inserting/creating new record: ${e.message}`,
                });
            }
        }
        /**
         * compute/set table-constraints settings for update task.
         * @param updateCascade - for updating target table reference-field value
         * @param updateSetNull - for updating target table reference-field value to null-value
         * @param updateSetDefault - for updating target table reference-field value to default-value
         */
        this.updateCascade = this.childRelations.map(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
        this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
        this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
        // update existing records/documents
        if (this.updateItems.length > 0) {
            this.taskType = TaskTypes.UPDATE
            try {
                // compute existParams for update task
                this.existParams = this.computeExistParams(this.updateItems)
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.existParams[0].length > 0) {
                    const noDuplication = await this.noRecordDuplication(this.updateItems);
                    if (noDuplication.code !== "success") {
                        return noDuplication;
                    }
                }
                this.recordIds = this.updateItems.map(it => it["_id"] as string)
                // get current records for update-cascade and audit log
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("id");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecord();
            } catch (e) {
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/documents by queryParams: permitted for / restricted to admin-user/owner only (intentional)
        if (this.recordIds.length < 1 && this.queryParams && !isEmptyObject(this.queryParams) &&
            this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // compute/check current-records
                const currentRec = await this.getCurrentRecords("queryparams");
                if (currentRec.code !== "success") {
                    return currentRec;
                }
                // compute updateItems from currentRecords, and include changes from actionParams
                const updateItem = this.actionParams[0]
                const updateItems: ActionParamsType = []
                for (const recordItem of this.currentRecs) {
                    // apply changes
                    for (const [key, val] of Object.entries(updateItem)) {
                        // exclude _id field/key from updateItem
                        if (key !== "_id") {
                            recordItem[key] = val
                        }
                    }
                    updateItems.push(recordItem)
                }
                this.updateItems = updateItems
                // compute existParams for update task
                this.existParams = this.computeExistParams(this.updateItems)
                // Prevent multiple updates with the same record(actionParam)
                if (this.currentRecs.length > 1 && this.existParams.length > 0 && this.existParams[0].length > 0 ) {
                    return getResMessage("paramsError", {
                        message: `Updates of multiple records[${this.currentRecs.length}] with unique constraints[${this.uniqueFields}] not allowed`
                    })
                }
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.existParams[0].length > 0) {
                    const noDuplication = await this.noRecordDuplication(this.updateItems);
                    if (noDuplication.code !== "success") {
                        return noDuplication;
                    }
                }
                this.recordIds = this.updateItems.map(it => it["_id"] as string)
                // update records
                return await this.updateRecord();
            } catch (e) {
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/documents by recordIds: permitted for / restricted to admin-user/owner only (intentional)
        if (this.recordIds && this.recordIds.length > 0 && this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // compute/check current-records
                const currentRec = await this.getCurrentRecords("id");
                if (currentRec.code !== "success") {
                    return currentRec;
                }
                // compute updateItems from currentRecords, and include changes from actionParams
                const updateItem = this.actionParams[0]
                const updateItems: ActionParamsType = []
                for (const recordItem of this.currentRecs) {
                    // apply changes
                    for (const [key, val] of Object.entries(updateItem)) {
                        // exclude _id field/key from updateItem
                        if (key !== "_id") {
                            recordItem[key] = val
                        }
                    }
                    updateItems.push(recordItem)
                }
                this.updateItems = updateItems
                // compute existParams for update task
                this.existParams = this.computeExistParams(this.updateItems)
                // Prevent multiple updates with the same record(actionParam)
                if (this.currentRecs.length > 1 && this.existParams.length > 0 && this.existParams[0].length > 0 ) {
                    return getResMessage("paramsError", {
                        message: `Updates of multiple records[${this.currentRecs.length}] with unique constraints[${this.existParams.length}] not allowed`
                    })
                }
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.existParams[0].length > 0) {
                    const noDuplication = await this.noRecordDuplication(this.updateItems);
                    if (noDuplication.code !== "success") {
                        return noDuplication;
                    }
                }
                // update records
                return await this.updateRecord();
            } catch (e) {
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
            createItems: ActionParamsType = [];
        // recordIds: Array<string> = [];

        // cases - actionParams.length === 1 OR > 1
        if (this.actionParams.length === 1) {
            let item = this.actionParams[0]
            if (!item["_id"]) {
                if (this.recordIds.length > 0 || !isEmptyObject(this.queryParams)) {
                    // update existing record(s), by recordIds or queryParams
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
                // update existing document/record, by recordId
                this.recordIds = [];
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
            }
        } else if (this.actionParams.length > 1) {
            // multiple/batch creation or update of document/records
            this.recordIds = [];
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
            recordIds: this.recordIds,
        };
    }

    async createRecord(): Promise<ResponseMessage> {
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
            const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
            const insertResult = await appDbColl.insertMany(this.createItems,);
            if (!insertResult.acknowledged || insertResult.insertedCount < 1) {
                throw new Error(`Unable to create new record(s), database error [${insertResult.insertedCount} of ${this.createItems.length} set to be created]`)
            }
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.tableName,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logCreate || this.logCrud) {
                const logRecs: LogRecordsType = {
                    logRecords: this.createItems,
                }
                const logParams: AuditLogParamsType = {
                    logRecords: logRecs,
                    tableName : this.tableName,
                    logBy     : this.userId,
                }
                logRes = await this.transLog.createLog(this.userId, logParams);
            }
            const resultValue: CrudResultType = {
                recordsCount: insertResult.insertedCount,
                recordIds   : Object.values(insertResult.insertedIds).map(it => it.toString()),
                logRes,
            }
            return getResMessage("success", {
                message: `Record(s) created successfully: ${insertResult.insertedCount} of ${this.createItems.length} item(s) created.`,
                value  : resultValue,
            });
        } catch (e) {
            return getResMessage("insertError", {
                message: `Error inserting/creating new record(s): ${e.message ? e.message : ""}`,
            });
        }
    }

    async updateRecord(): Promise<ResponseMessage> {
        // validate referential integrity
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // validate update records
        if (this.updateItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to update record(s), due to incomplete/incorrect input-parameters. ",
            });
        }
        // check/validate update/upsert command for multiple records
        try {
            let updateCount = 0;
            let updateMatchedCount = 0;
            // update multiple records
            const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
            for await (const item of this.updateItems) {
                // destruct _id /other attributes
                const {_id, ...otherParams} = item;
                const updateResult = await appDbColl.updateOne({
                    _id: new ObjectId(_id as string),
                }, {
                    $set: otherParams,
                },);
                if (!updateResult.acknowledged || updateResult.modifiedCount !== updateResult.matchedCount) {
                    continue
                }
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount
            }
            if (updateCount < 1) {
                throw new Error("No records updated. Please retry.")
            }
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.tableName,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            // check the audit-log settings - to perform audit-log
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            if (this.logUpdate || this.logCrud) {
                const logRecs: LogRecordsType = {
                    logRecords: this.currentRecs,
                }
                const newLogRecs: LogRecordsType = {
                    logRecords: this.updateItems,
                }
                const logParams: AuditLogParamsType = {
                    logRecords   : logRecs,
                    newLogRecords: newLogRecs,
                    tableName    : this.tableName,
                    logBy        : this.userId,
                }
                logRes = await this.transLog.updateLog(this.userId, logParams);
            }
            const resultValue: CrudResultType = {
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

}

// factory function/constructor
function newSaveRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new SaveRecord(params, options);
}

export { SaveRecord, newSaveRecord };
