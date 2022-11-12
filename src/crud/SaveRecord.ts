/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-24
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: save-record(s) (create/insert and update record(s))
 */

// Import required module/function(s)
import { ObjectId } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { deleteHashCache } from "@mconnect/mccache";
import {isEmptyObject} from "../orm";
import Crud from "./Crud";
import {
    ActionParamsType, ActionParamTaskType, CrudOptionsType, CrudParamsType, LogDocumentsType, TaskTypes
} from "./types";
import { FieldDescType, ModelOptionsType, RelationActionTypes } from "../orm";

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
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
        }

        // determine update / create (new) items from actionParams
        await this.computeItems();
        // validate createItems and updateItems
        if (this.createItems.length === this.updateItems.length) {
            return getResMessage("saveError", {
                message: "Only Create or Update tasks, not both, may be performed exclusively.",
                value  : {},
            });
        }
        if (this.createItems.length < 1 && this.updateItems.length < 1) {
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

        // Ensure the _id for existParams are of type mongoDb-new ObjectId, for create / update actions
        if (this.existParams && this.existParams.length > 0) {
            this.existParams.forEach((item: any) => {
                // transform/cast id, from string, to mongoDB-new ObjectId
                Object.keys(item).forEach((itemKey: string) => {
                    if (itemKey.toString().toLowerCase().endsWith("id")) {
                        // create
                        if (typeof item[itemKey] === "string" && item[itemKey] !== "" && item[itemKey].length <= 24) {
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
        if (this.taskType === TaskTypes.CREATE && this.createItems.length > 0) {
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.createItems.length <= this.existParams.length) {
                    const recExist: ResponseMessage = await this.checkRecExist();
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
        if (this.taskType === TaskTypes.UPDATE && this.updateItems.length > 0) {
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.updateItems.length <= this.existParams.length) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records for update-cascade and audit log
                this.updateCascade = this.childRelations.map(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
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

        // update records/documents by queryParams: permitted for admin user only
        if (this.taskType === TaskTypes.UPDATE && this.isAdmin && this.docIds.length < 1 &&
            this.queryParams && !isEmptyObject(this.queryParams) && this.actionParams.length === 1) {
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0 && this.actionParams.length <= this.existParams.length) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
                this.updateCascade = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
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

        // return save-error message
        return getResMessage("saveError", {
            message: "Error performing the requested operation(s). Please retry",
        });
    }

    // helper methods:
    async computeItems(modelOptions: ModelOptionsType = this.modelOptions): Promise<ActionParamTaskType> {
        let updateItems: ActionParamsType = [],
            docIds: Array<string> = [],
            createItems: ActionParamsType = [];

        // Ensure the _id for actionParams are of type mongoDb-new ObjectId, for update actions
        if (this.actionParams && this.actionParams.length > 0) {
            this.actionParams.forEach((item: any) => {
                if (item._id) {
                    // update/existing document
                    if (modelOptions.actorStamp) {
                        item.updatedBy = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item.updatedAt = new Date();
                    }
                    if (modelOptions.activeStamp && item.isActive === undefined) {
                        item.isActive = true;
                    }
                    updateItems.push(item);
                    docIds.push(item._id);
                } else {
                    // exclude any traces of _id, especially without concrete value ("", null, undefined), if present
                    const {_id, ...saveParams} = item;
                    item = saveParams;
                    // create/new document
                    if (modelOptions.actorStamp) {
                        item.createdBy = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item.createdAt = new Date();
                    }
                    if (modelOptions.activeStamp && item.isActive === undefined) {
                        item.isActive = true;
                    }
                    createItems.push(item);
                }
            });
            this.createItems = createItems;
            this.updateItems = updateItems;
            this.docIds = docIds;
        }
        return {
            createItems,
            updateItems,
            docIds,
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
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        // insert/create record(s) and log in audit-collection
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // insert/create multiple records and audit-log
            let records: any;
            // trx starts
            await session.withTransaction(async () => {
                const appDbColl = this.appDb.collection(this.coll);
                records = await appDbColl.insertMany(this.createItems, {session});
                await session.commitTransaction();
            });
            // trx ends
            if (records.insertedCount > 0) {
                // delete cache
                deleteHashCache(this.cacheKey, this.coll, "key");
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logCreate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.createItems,
                    }
                    logRes = await this.transLog.createLog(this.coll, logDocuments, this.userId);
                }
                return getResMessage("success", {
                    message: "Record(s) created successfully.",
                    value  : {
                        docCount: records.insertedCount,
                        docIds  : records.insertedIds,
                        logRes,
                    },
                });
            } else {
                return getResMessage("insertError", {
                    message: "Unable to create new record(s), database error. ",
                });
            }

        } catch (e) {
            return getResMessage("insertError", {
                message: `Error inserting/creating new record(s): ${e.message ? e.message : ""}`,
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
        if (this.updateItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to update record(s), due to incomplete/incorrect input-parameters. ",
            });
        }
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        // updated record(s)
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // check/validate update/upsert command for multiple records
            let updateCount = 0;
            // update one record
            if (this.updateItems.length === 1) {
                // destruct _id /other attributes
                const item: any = this.updateItems[0];
                const {
                    _id,
                    ...otherParams
                } = item;
                // trx starts
                await session.withTransaction(async () => {
                    // perform update task
                    const appDbColl = this.appDb.collection(this.coll);
                    // current record prior to update
                    const currentRec = await appDbColl.findOne({_id: new ObjectId(_id)}, {session,});
                    if (!currentRec || isEmptyObject(currentRec)) {
                        await session.abortTransaction();
                        throw new Error("Unable to retrieve current record for update.");
                    }
                    const updateResult = await appDbColl.updateOne({
                        _id: new ObjectId(_id),
                    }, {
                        $set: otherParams,
                    }, {session});
                    if (updateResult.modifiedCount !== updateResult.matchedCount) {
                        await session.abortTransaction();
                        throw new Error("Error updating document(s).")
                    }
                    // update the child-collections (update-cascade) | from current and new update-field-values
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
                            // const targetDocDesc = cItem.targetModel.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            const currentFieldValue = currentRec[sourceField] || null;   // current value
                            const newFieldValue = item[sourceField] || null;         // new value (set-value)
                            if (currentFieldValue === newFieldValue || !newFieldValue) {
                                // skip update
                                continue;
                            }
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = newFieldValue;
                            const TargetColl = this.appDb.collection(targetColl);
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
                            const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            // compute default values for the targetFields
                            const defaultValues = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                            const defaultValue = defaultValues[targetField] || null;
                            if (currentFieldValue === newFieldValue || !newFieldValue || !defaultValue) {
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
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = defaultValue;
                            const TargetColl = this.appDb.collection(targetColl);
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
                            const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                            const nullValue = null;
                            if (currentFieldValue === newFieldValue || !newFieldValue) {
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
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                    updateCount += Number(updateResult.modifiedCount);
                    await session.commitTransaction();
                });
                // trx ends
            }
            // update multiple records
            if (this.updateItems.length > 1) {
                for await (const item of this.updateItems) {
                    // destruct _id /other attributes
                    const {
                        _id,
                        ...otherParams
                    } = item;

                    // trx starts
                    await session.withTransaction(async () => {
                        // perform update task
                        const appDbColl = this.appDb.collection(this.coll);
                        // current record prior to update
                        const currentRec = await appDbColl.findOne({_id: new Object(_id as string)}, {session,});
                        if (!currentRec || isEmptyObject(currentRec)) {
                            await session.abortTransaction();
                            throw new Error("Unable to retrieve current record for update.");
                        }
                        const updateResult = await appDbColl.updateOne({
                            _id: new ObjectId(_id as string),
                        }, {
                            $set: otherParams,
                        }, {session,});
                        if (updateResult.modifiedCount !== updateResult.matchedCount) {
                            await session.abortTransaction();
                            throw new Error("Error updating document(s).")
                        }
                        // update the child-collections (update-cascade) | from current and new update-field-values
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
                                // const targetDocDesc = cItem.targetModel?.docDesc || {};
                                const targetColl = cItem.targetModel.collName || cItem.targetColl;
                                const currentFieldValue = currentRec[sourceField] || null;   // current value
                                const newFieldValue = item[sourceField] || null;         // new value (set-value)
                                if (currentFieldValue === newFieldValue || !newFieldValue) {
                                    // skip update
                                    continue;
                                }
                                let updateQuery: any = {};
                                let updateSet: any = {};
                                updateQuery[targetField] = currentFieldValue;
                                updateSet[targetField] = newFieldValue;
                                const TargetColl = this.appDb.collection(targetColl);
                                const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                                if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                    await session.abortTransaction();
                                    throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                                }
                            }
                        } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                        else if (this.updateSetDefault) {
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
                                const targetDocDesc = cItem.targetModel?.docDesc || {};
                                const targetColl = cItem.targetModel.collName || cItem.targetColl;
                                // compute default values for the targetFields
                                const defaultValues = await this.computeDefaultValues(targetDocDesc);
                                const currentFieldValue = currentRec[sourceField];   // current value of the targetField
                                const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                                const defaultValue = defaultValues[targetField] || null;
                                if (currentFieldValue === newFieldValue || !newFieldValue || !defaultValue) {
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
                                let updateQuery: any = {};
                                let updateSet: any = {};
                                updateQuery[targetField] = currentFieldValue;
                                updateSet[targetField] = defaultValue;
                                const TargetColl = this.appDb.collection(targetColl);
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
                                const targetDocDesc = cItem.targetModel?.docDesc || {};
                                const targetColl = cItem.targetModel.collName || cItem.targetColl;
                                const currentFieldValue = currentRec[sourceField];  // current value of the targetField
                                const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                                const nullValue = null;
                                if (currentFieldValue === newFieldValue || !newFieldValue) {
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
                                let updateQuery: any = {};
                                let updateSet: any = {};
                                updateQuery[targetField] = currentFieldValue;
                                updateSet[targetField] = nullValue;
                                const TargetColl = this.appDb.collection(targetColl);
                                const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                                if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                    await session.abortTransaction();
                                    throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                                }
                            }
                        }
                        updateCount += Number(updateResult.modifiedCount);
                        await session.commitTransaction();
                    });
                    // trx ends
                }
            }
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache(this.cacheKey, this.coll, "key");
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    }
                    const newLogDocuments: LogDocumentsType = {
                        collDocuments: this.updateItems,
                    }
                    logRes = await this.transLog.updateLog(this.coll, logDocuments, newLogDocuments, this.userId);
                }
                return getResMessage("success", {
                    message: "Record(s) updated successfully.",
                    value  : {
                        docCount: updateCount,
                        logRes,
                    },
                });
            } else {
                return getResMessage("updateError", {
                    message: "No records updated. Please retry.",
                });
            }
        } catch (e) {
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
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        // updated record(s)
        // create a transaction session
        const session = this.dbClient.startSession();
        let updateResult: any;
        try {
            // destruct _id /other attributes
            const item: any = this.actionParams[0];
            const {_id, ...otherParams} = item;
            // perform update task
            const appDbColl = this.appDb.collection(this.coll);
            // include item stamps: userId and date
            otherParams.updatedBy = this.userId;
            otherParams.updatedAt = new Date();
            let updateParams = otherParams;
            // include update query-params for audit-log??
            // updateParams.queryParams = this.queryParams;

            // transaction starts
            await session.withTransaction(async () => {
                // current records prior to update OR use this.currentRecs?
                const currentRecs = await appDbColl.find(this.queryParams, {session}).toArray();
                if (!currentRecs || currentRecs.length < 1) {
                    await session.abortTransaction();
                    throw new Error("Unable to retrieve current document(s) for update.");
                }
                updateResult = await appDbColl.updateMany(this.queryParams, {
                    $set: otherParams
                }, {session,});
                if (updateResult.modifiedCount !== updateResult.matchedCount) {
                    await session.abortTransaction();
                    throw new Error("Error updating document(s).")
                }
                // update the child-collections (for update-cascade) | from actionParams[0]-item
                // update the child-collections (update-cascade) | from current and new update-field-values
                if (this.updateCascade) {
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
                            // const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            const currentFieldValue = currentRec[sourceField] || null;   // current value
                            const newFieldValue = item[sourceField] || null;         // new value (set-value)
                            if (currentFieldValue === newFieldValue || !newFieldValue) {
                                // skip update
                                continue;
                            }
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = newFieldValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                else if (this.updateSetDefault) {
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
                            const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            // compute default values for the targetFields
                            const defaultValues = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField];   // current value of the targetField
                            const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                            const defaultValue = defaultValues[targetField] || null;
                            if (currentFieldValue === newFieldValue || !newFieldValue || !defaultValue) {
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
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = defaultValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.updateSetNull) {
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
                            const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            const currentFieldValue = currentRec[sourceField];  // current value of the targetField
                            const newFieldValue = item[sourceField] || null; // new value (default-value) of the targetField
                            const nullValue = null;
                            if (currentFieldValue === newFieldValue || !newFieldValue) {
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
                            let updateQuery: any = {};
                            let updateSet: any = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                await session.commitTransaction();
            });
            // trx ends
            if (Number(updateResult.modifiedCount) > 0) {
                // delete cache
                await deleteHashCache(this.cacheKey, this.coll, "key");
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    }
                    const newLogDocuments: LogDocumentsType = {
                        queryParam: updateParams,
                    }
                    logRes = await this.transLog.updateLog(this.coll, logDocuments, newLogDocuments, this.userId);
                }
                return getResMessage("success", {
                    message: "Requested action(s) performed successfully.",
                    value  : {
                        docCount: updateResult.modifiedCount,
                        logRes,
                    },
                });
            } else {
                return getResMessage("updateError", {
                    message: "No records updated. Please retry.",
                });
            }
        } catch (e) {
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
function newSaveRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new SaveRecord(params, options);
}

export { SaveRecord, newSaveRecord };
