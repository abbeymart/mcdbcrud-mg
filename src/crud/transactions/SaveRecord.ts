// 2024-01-07
import { ObjectId, UpdateResult, InsertManyResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { deleteHashCache, QueryHashCacheParamsType } from "@mconnect/mccache";
import { FieldDescType, ModelOptionsType, RelationActionTypes } from "../../orm";
import { isEmptyObject } from "../utils";
import Crud from "../Crud";
import {
    ActionParamsType, ActionParamTaskType, ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType,
    LogRecordsType, QueryParamsType, TaskTypes
} from "../types";

class SaveRecordTrans extends Crud {
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
                        // create
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
                    const noDuplication = await this.noRecordDuplication();
                    if (noDuplication.code !== "success") {
                        return noDuplication;
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
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const noDuplication = await this.noRecordDuplication();
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
                console.error(e);
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
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.noRecordDuplication();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
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

        // update records/documents by recordIds: permitted for / restricted to admin-user/owner only (intentional)
        if (this.recordIds && this.recordIds.length > 0 && this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.noRecordDuplication();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
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
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // insert/create multiple records and audit-log
            let insertResult: InsertManyResult = {acknowledged: false, insertedCount: 0, insertedIds: {}};
            let logRes = {code: "unknown", message: "", value: {}, resCode: 200, resMessage: ""};
            let resultValue: CrudResultType = {}
            // trx starts
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                insertResult = await appDbColl.insertMany(this.createItems, {session});
                // commit or abort trx
                if (!insertResult.acknowledged || insertResult.insertedCount !== this.createItems.length) {
                    await session.abortTransaction()
                    throw new Error(`Unable to create new record(s), database error [${insertResult.insertedCount} of ${this.createItems.length} set to be created]. Transaction aborted.`)
                }
                // perform delete cache and audit-log tasks
                const cacheParams: QueryHashCacheParamsType = {
                    key : this.cacheKey,
                    hash: this.tableName,
                    by  : "hash",
                }
                deleteHashCache(cacheParams);
                // check the audit-log settings - to perform audit-log
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
                resultValue = {
                    recordsCount: insertResult.insertedCount,
                    recordIds   : Object.values(insertResult.insertedIds).map(it => it.toString()),
                    logRes,
                }
                await session.commitTransaction();
            });
            return getResMessage("success", {
                message: `Record(s) created successfully: ${insertResult.insertedCount} of ${this.createItems.length} items created.`,
                value  : resultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("insertError", {
                message: `Error inserting/creating new record(s): ${e.message ? e.message : ""}`,
            });
        } finally {
            await session.endSession();
        }
    }

    async updateRecord(): Promise<ResponseMessage> {
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
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // update multiple records
            let updateCount = 0;
            let updateMatchedCount = 0;
            // let updateResult: UpdateResult = {
            //     acknowledged: false, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null
            // }
            let resultValue: CrudResultType = {}
            // trx starts
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                for await (const item of this.updateItems) {
                    // destruct _id /other attributes
                    const {_id, ...otherParams} = item;
                    // current record prior to update
                    const currentRec = await appDbColl.findOne({_id: new ObjectId(_id)}, {session,});
                    if (!currentRec || isEmptyObject(currentRec)) {
                        await session.abortTransaction();
                        throw new Error("Unable to retrieve current record for update.");
                    }
                    const updateResult = await appDbColl.updateOne({
                        _id: new ObjectId(_id as string),
                    }, {
                        $set: otherParams,
                    }, {session});
                    if (!updateResult.acknowledged || updateResult.modifiedCount !== updateResult.matchedCount) {
                        await session.abortTransaction();
                        throw new Error(`Error updating record(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                    }
                    // optional step, update the child-collections (update-cascade) | from current and new update-field-values
                    if (this.updateCascade) {
                        const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine update-cascade-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the update-cascade-task");
                            }
                            // const targetDocDesc = cItem.targetModel.tableDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            const currentFieldValue = currentRec[sourceField] || null;   // current value
                            const newFieldValue = item[sourceField] || null;         // new value (set-value)
                            if (currentFieldValue === newFieldValue) {
                                // skip update
                                continue;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = newFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                    } else if (this.updateSetDefault) {
                        const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-default-task");
                            }
                            const targetDocDesc = cItem.targetModel?.recordDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            // compute default values for the targetFields
                            const defaultDocValue = await this.computeRecordDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const defaultFieldValue = defaultDocValue[targetField] || null;
                            if (currentFieldValue === defaultFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-default-field
                                    if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = defaultFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    } else if (this.updateSetNull) {
                        const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-null-task");
                            }
                            const targetDocDesc = cItem.targetModel?.recordDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const nullFieldValue = initializeDocValue[targetField] || null;
                            if (currentFieldValue === nullFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                    if (updateResult.modifiedCount < 1) {
                        continue
                    }
                    updateCount += updateResult.modifiedCount;
                    updateMatchedCount += updateResult.matchedCount
                }
                // validate overall transaction
                if (updateCount < 1 || updateCount != updateMatchedCount) {
                    await session.abortTransaction()
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
                resultValue = {
                    recordsCount: updateCount,
                    logRes,
                }
                await session.commitTransaction()
            });
            // trx ends
            return getResMessage("success", {
                message: `Update completed - [${updateCount} of ${updateMatchedCount} updated].`,
                value  : resultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }

    async updateRecordById(): Promise<ResponseMessage> {
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...updateParams} = item;
            // include item stamps: userId and date
            updateParams.updatedBy = this.userId;
            updateParams.updatedAt = new Date();
            let updateCount = 0;
            let updateMatchedCount = 0;
            // trx starts
            let resultValue: CrudResultType = {}
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                // update by recordIds
                const updateResult = await appDbColl.updateMany({_id: {$in: this.recordIds.map(id => new ObjectId(id))}}, {
                    $set: updateParams
                }, {session,});
                if (!updateResult.acknowledged || updateResult.modifiedCount !== updateResult.matchedCount) {
                    await session.abortTransaction();
                    throw new Error(`Error updating record(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                }
                // optional step, update the child-collections (update-cascade) | from current and new update-field-values
                if (this.updateCascade && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine update-cascade-action
                        if (!cItem.targetModel) {
                            // handle as error
                            await session.abortTransaction();
                            throw new Error("Target model is required to complete the update-cascade-task");
                        }
                        // const targetDocDesc = cItem.targetModel?.tableDesc || {};
                        const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                        const currentFieldValue = currentRec[sourceField] || null;   // current value
                        const newFieldValue = item[sourceField] || null;         // new value (set-value)
                        if (currentFieldValue === newFieldValue) {
                            // skip update
                            continue;
                        }
                        let updateQuery: QueryParamsType = {};
                        let updateSet: ActionParamType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = newFieldValue;
                        const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            await session.abortTransaction();
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                else if (this.updateSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine default-action
                        if (!cItem.targetModel) {
                            // handle as error
                            await session.abortTransaction();
                            throw new Error("Target model is required to complete the set-default-task");
                        }
                        const targetDocDesc = cItem.targetModel?.recordDesc || {};
                        const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                        // compute default values for the targetFields
                        const defaultDocValue = await this.computeRecordDefaultValues(targetDocDesc);
                        const currentFieldValue = currentRec[sourceField];   // current value of the targetField
                        const defaultFieldValue = defaultDocValue[targetField] || null;
                        if (currentFieldValue === defaultFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField default value | check if setDefault is permissible for the targetField
                        let targetFieldDesc = targetDocDesc[targetField];
                        switch (typeof targetFieldDesc) {
                            case "object":
                                targetFieldDesc = targetFieldDesc as FieldDescType
                                // handle non-default-field
                                if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                    await session.abortTransaction();
                                    throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                }
                                break;
                            default:
                                break;
                        }
                        let updateQuery: QueryParamsType = {};
                        let updateSet: ActionParamType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = defaultFieldValue;
                        const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            await session.abortTransaction();
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                } else if (this.updateSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine allowNull-action
                        if (!cItem.targetModel) {
                            // handle as error
                            await session.abortTransaction();
                            throw new Error("Target model is required to complete the set-null-task");
                        }
                        const targetDocDesc = cItem.targetModel?.recordDesc || {};
                        const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                        const currentFieldValue = currentRec[sourceField];  // current value of the targetField
                        const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                        const nullFieldValue = initializeDocValue[targetField] || null;
                        if (currentFieldValue === nullFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField null value | check if allowNull is permissible for the targetField
                        let targetFieldDesc = targetDocDesc[targetField];
                        switch (typeof targetFieldDesc) {
                            case "object":
                                targetFieldDesc = targetFieldDesc as FieldDescType
                                // handle non-null-field
                                if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                    await session.abortTransaction();
                                    throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                }
                                break;
                            default:
                                break;
                        }
                        let updateQuery: QueryParamsType = {};
                        let updateSet: ActionParamType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = nullFieldValue;
                        const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            await session.abortTransaction();
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                }
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount
                // commit or abort trx
                if (updateCount < 1 || updateCount != updateMatchedCount) {
                    await session.abortTransaction()
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
                        queryParam: updateParams,
                    }
                    const logParams: AuditLogParamsType = {
                        logRecords   : logRecs,
                        newLogRecords: newLogRecs,
                        tableName    : this.tableName,
                        logBy        : this.userId,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                resultValue = {
                    recordsCount: updateCount,
                    logRes,
                }
                await session.commitTransaction()
            });
            // trx ends

            return getResMessage("success", {
                message: "Document updated completed successfully.",
                value  : resultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }

    async updateRecordByParams(): Promise<ResponseMessage> {
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...updateParams} = item;
            // include item stamps: userId and date
            updateParams.updatedBy = this.userId;
            updateParams.updatedAt = new Date();
            let updateCount = 0;
            let updateMatchedCount = 0;
            // trx starts
            let updateResult: UpdateResult = {
                acknowledged: false, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null
            }
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                // query current records prior to update
                const currentRecs = await appDbColl.find(this.queryParams, {session}).toArray();
                if (!currentRecs || currentRecs.length < 1) {
                    await session.abortTransaction();
                    throw new Error("Unable to retrieve current record(s) for update.");
                }
                updateResult = await appDbColl.updateMany(this.queryParams, {
                    $set: updateParams
                }, {session,}) as UpdateResult;
                if (updateResult.modifiedCount !== updateResult.matchedCount) {
                    await session.abortTransaction();
                    throw new Error(`Error updating record(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                }
                // optional step, update the child-collections (for update-cascade) | from actionParams[0]-item
                // update the child-collections (update-cascade) | from current and new update-field-values
                if (this.updateCascade && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                    for await (const currentRec of currentRecs) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine update-cascade-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the update-cascade-task");
                            }
                            // const targetDocDesc = cItem.targetModel?.tableDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            const currentFieldValue = currentRec[sourceField] || null;   // current value
                            const newFieldValue = item[sourceField] || null;         // new value (set-value)
                            if (currentFieldValue === newFieldValue) {
                                // skip update
                                continue;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = newFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                else if (this.updateSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                    for await (const currentRec of currentRecs) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-default-task");
                            }
                            const targetDocDesc = cItem.targetModel?.recordDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            // compute default values for the targetFields
                            const defaultDocValue = await this.computeRecordDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField];   // current value of the targetField
                            const defaultFieldValue = defaultDocValue[targetField] || null;    // new value (default-value) of the targetField
                            if (currentFieldValue === defaultFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-default-field
                                    if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = defaultFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.updateSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                    for await (const currentRec of currentRecs) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-null-task");
                            }
                            const targetDocDesc = cItem.targetModel?.recordDesc || {};
                            const targetColl = cItem.targetModel.tableName || cItem.targetTable;
                            const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = currentRec[sourceField];  // current value of the targetField
                            const nullFieldValue = initializeDocValue[targetField] || null; // new value (default-value) of the targetField
                            if (currentFieldValue === nullFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount
                // commit or abort trx
                if (updateCount < 1 || updateCount != updateMatchedCount) {
                    throw new Error("No records updated. Please retry.")
                }
                await session.abortTransaction()
            });
            updateCount += updateResult.modifiedCount;
            updateMatchedCount += updateResult.matchedCount
            if (!updateResult.acknowledged || updateCount != updateMatchedCount) {
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
                    queryParam: updateParams,
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
                message: "Document updated completed successfully.",
                value  : resultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }
}

// factory function/constructor
function newSaveRecordTrans(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new SaveRecordTrans(params, options);
}

export { SaveRecordTrans, newSaveRecordTrans };
