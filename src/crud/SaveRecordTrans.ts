// 2024-01-07 | requires mongodb-replicas
import { ObjectId, InsertManyResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { deleteHashCache, QueryHashCacheParamsType } from "@mconnect/mccache";
import { FieldDescType, ModelOptionsType, RelationActionTypes } from "../orm";
import { isEmptyObject } from "./utils";
import {
    ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, QueryParamsType,
} from "./types";
import { SaveRecord } from "./SaveRecord";

class SaveRecordTrans extends SaveRecord {
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

    async createRecord(): Promise<ResponseMessage> {
        if (this.createItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to create new record(s), due to incomplete/incorrect input-parameters[actionParams]. ",
            });
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
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
        // validate referential integrity
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // validate update records
        if (this.updateItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to update record(s), due to incomplete/incorrect input-parameters[actionParams]. ",
            });
        }
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // update multiple records
            let updateCount = 0;
            let updateMatchedCount = 0;
            let resultValue: CrudResultType = {}
            // trx starts
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                for await (const recordItem of this.updateItems) {
                    // destruct _id /other attributes
                    const {_id, ...otherParams} = recordItem;
                    // current record prior to update
                    const currentRec = await appDbColl.findOne({_id: new ObjectId(_id as string)}, {session,}) as ActionParamType;
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
                            // check if target model is defined/specified, required to determine update-cascade-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the update-cascade-task");
                            }
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const targetFieldValue = recordItem[sourceField] || null;   // new value (set/cascade-value) for the targetField
                            if (!targetFieldValue || currentFieldValue === targetFieldValue) {
                                // skip update for null targetFieldValue or no change in current and target values
                                continue;
                            }
                            const updateQuery: QueryParamsType = {};    // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};      // to set the new-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = targetFieldValue;
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetDbColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetDbColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    } else if (this.updateSetDefault) {
                        // optional, update child-docs for setDefault, if this.updateSetDefault
                        const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine default-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source and Target models are required to complete the set-default-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            // compute default values for the targetFields
                            const defaultRecordValues = await this.computeRecordDefaultValues(sourceRecordDesc, recordItem);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const targetFieldValue = defaultRecordValues[sourceField] || null; // new value for the targetField
                            if (!targetFieldValue || currentFieldValue === targetFieldValue) {
                                // skip update for null targetFieldValue or no change in current and target values
                                continue;
                            }
                            const updateQuery: QueryParamsType = {};  // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};    // to set the new-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = targetFieldValue;
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetDbColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetDbColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(set-default) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    } else if (this.updateSetNull) {
                        // optional, update child-docs for null/initializeValues, if this.updateSetNull
                        const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source and Target models are required to complete the set-null-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            const recordInitializedValues = this.computeInitializeValues(sourceRecordDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const targetFieldValue = recordInitializedValues[sourceField] || null;
                            if (currentFieldValue === targetFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetRecordDesc = cItem.targetModel.recordDesc || {};
                            let targetFieldDesc = targetRecordDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (targetFieldDesc.allowNull !== undefined && !targetFieldDesc.allowNull) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            const updateQuery: QueryParamsType = {};    // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};      // to set the new-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = targetFieldValue;
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetDbColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetDbColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(null/zero-value) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                    updateCount += updateResult.modifiedCount
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
                message: `Update completed successfully: [${updateCount} of ${updateMatchedCount} records updated].`,
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
