/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * Updated 2018-04-08, prototype-to-class
 * @Company: mConnect.biz | @License: MIT
 * @Description: delete one or more records / documents by docIds or queryParams
 */

// Import required module/function(s)
import {ObjectId, DeleteResult, UpdateResult,} from "mongodb";
import {getResMessage, ResponseMessage} from "@mconnect/mcresponse";
import {isEmptyObject} from "../orm";
import {deleteHashCache} from "@mconnect/mccache";
import Crud from "./Crud";
import {
    CrudOptionsType, CrudParamsType, CrudResultType, LogDocumentsType, ObjectRefType, SubItemsType
} from "./types";
import {FieldDescType, RelationActionTypes} from "../orm";

class DeleteRecord extends Crud {
    protected collRestrict: boolean;
    protected deleteRestrict: boolean;
    protected deleteSetNull: boolean;
    protected deleteSetDefault: boolean;

    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
        this.currentRecs = [];
        this.collRestrict = false;
        this.deleteRestrict = false;
        this.deleteSetNull = false;
        this.deleteSetDefault = false;
    }

    async deleteRecord(): Promise<ResponseMessage> {
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

        // for queryParams, exclude _id, if present
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            let querySpec = this.queryParams;
            const {_id, ...otherParams} = querySpec;
            this.queryParams = otherParams;
        }

        // delete / remove item(s) by docId(s) | usually for owner, admin and by role-assignment on collection/collection-documents
        if (this.docIds && this.docIds.length > 0) {
            try {
                this.deleteRestrict = this.childRelations.filter(item => item.onDelete === RelationActionTypes.RESTRICT).length > 0;
                this.deleteSetDefault = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT).length > 0;
                this.deleteSetNull = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL).length > 0;
                this.collRestrict = this.childRelations.filter(item => (item.onDelete === RelationActionTypes.RESTRICT && item.sourceColl === item.targetColl)).length > 0;
                // check if records exist, for delete and audit-log
                if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.collRestrict) {
                    const recExist = await this.getCurrentRecords("id");
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // sub-items integrity check, same collection
                if (this.collRestrict) {
                    const subItem = await this.checkSubItemById();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // parent-child integrity check, multiple collections
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrityById();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordById();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message ? error.message : "Error removing record(s)",
                });
            }
        }

        // delete / remove item(s) by queryParams | usually for owner, admin and by role-assignment on collection/collection-documents
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            try {
                this.deleteRestrict = this.childRelations.map(item => item.onDelete === RelationActionTypes.RESTRICT).length > 0;
                this.deleteSetDefault = this.childRelations.map(item => item.onDelete === RelationActionTypes.SET_DEFAULT).length > 0;
                this.deleteSetNull = this.childRelations.map(item => item.onDelete === RelationActionTypes.SET_NULL).length > 0;
                this.collRestrict = this.childRelations.map(item => (item.onDelete === RelationActionTypes.RESTRICT && item.sourceColl === item.targetColl)).length > 0;
                // check if records exist, for delete and audit-log
                if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.collRestrict) {
                    const recExist = await this.getCurrentRecords("queryParams");
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // sub-items integrity check, same collection
                if (this.collRestrict) {
                    const subItem = await this.checkSubItemByParams();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // parent-child integrity check, multiple collections
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrityByParams();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordByParams();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message,
                });
            }
        }

        // could not remove document
        return getResMessage("removeError", {
            message: "Unable to perform the requested action(s), due to incomplete/incorrect delete conditions. ",
        });
    }

    // checkSubItemById checks referential integrity for same collection, by id
    async checkSubItemById(): Promise<ResponseMessage> {
        // check if any/some of the collection contain at least a sub-item/document
        const appDbColl = this.appDb.collection(this.coll);
        const docWithSubItems = await appDbColl.findOne({
            parentId: {
                $in: this.docIds,
            }
        });
        if (docWithSubItems && !isEmptyObject(docWithSubItems)) {
            return getResMessage("subItems", {
                message: "A record that includes sub-items cannot be deleted. Delete/remove the sub-items or update/remove the parentId field-value, first.",
            });
        } else {
            return getResMessage("success", {
                message: "no data integrity issue",
            });
        }
    }

    // checkSubItemByParams checks referential integrity for same collection, by queryParam
    async checkSubItemByParams(): Promise<ResponseMessage> {
        // check if any/some of the collection contain at least a sub-item/document
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.docIds = [];          // reset docIds instance value
            this.currentRecs.forEach((item: ObjectRefType) => {
                this.docIds.push(item["_id"]);
            });
            return await this.checkSubItemById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    // checkRefIntegrityById checks referential integrity for parent-child collections, by document-Id
    async checkRefIntegrityById(): Promise<ResponseMessage> {
        // required-inputs: parent/child-collections and current item-id/item-name
        if (this.childRelations.length < 1) {
            return getResMessage("success", {
                message: "no data integrity condition specified or required",
            });
        }
        if (this.docIds.length > 0) {
            // prevent item delete, if child-collection-items reference itemId
            let subItems: Array<SubItemsType> = []
            // docIds ref-check
            const childExist = this.childRelations.some(async (relation) => {
                const targetDbColl = this.appDb.collection(relation.targetColl);
                // include foreign-key/target as the query condition
                const targetField = relation.targetField;
                const sourceField = relation.sourceField;
                const query: ObjectRefType = {}
                if (sourceField === "_id") {
                    query[targetField] = {
                        $in: this.docIds,
                    }
                } else {
                    // other source-fields besides _id
                    const sourceFieldValues = this.currentRecs.map((item: ObjectRefType) => item[sourceField]);
                    query[targetField] = {
                        $in: sourceFieldValues,
                    }
                }
                const collItem = targetDbColl.find(query);
                if (collItem && !isEmptyObject(collItem)) {
                    subItems.push({
                        collName          : relation.targetColl,
                        hasRelationRecords: true,
                    });
                    return true;
                } else {
                    subItems.push({
                        collName          : relation.targetColl,
                        hasRelationRecords: false,
                    });
                    return false;
                }
            });
            this.subItems = subItems;
            if (childExist) {
                return getResMessage("subItems", {
                    message: `A record that contains sub-items cannot be deleted. Delete/remove the sub-items [from ${this.childColls.join(", ")} collection(s)], first.`,
                    value  : subItems,
                });
            } else {
                return getResMessage("success", {
                    message: "no data integrity issue",
                    value  : subItems,
                });
            }
        } else {
            return getResMessage("success", {
                message: "docIds is required for integrity check/validation",
            });
        }
    }

    // checkRefIntegrityByParams checks referential integrity for parent-child collections, by queryParams
    async checkRefIntegrityByParams(): Promise<ResponseMessage> {
        // required-inputs: parent/child-collections and current item-id/item-name
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.docIds = [];
            this.currentRecs.forEach((item: ObjectRefType) => {
                this.docIds.push(item["_id"]);
            });
            return await this.checkRefIntegrityById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    async removeRecordById(): Promise<ResponseMessage> {
        // delete/remove records and log in audit-collection
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // trx starts
            let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
                // id(s): convert string to ObjectId
                const docIds = this.docIds.map(id => new ObjectId(id));
                removed = await appDbColl.deleteMany({
                    _id: {
                        $in: docIds,
                    }
                }, {session});
                if (removed.deletedCount !== docIds.length) {
                    await session.abortTransaction();
                    throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${docIds.length} set to be removed]. Transaction aborted.`)
                }
                // optional, update child-collection-documents for setDefault and setNull/initialize-value?', i.e. if this.deleteSetDefault or this.deleteSetNull
                if (this.deleteSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    for await (const currentRec of (this.currentRecs as Array<ObjectRefType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-default-task");
                            }
                            const targetDocDesc = cItem.targetModel.docDesc || {};
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            // compute default values for the targetFields
                            const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                            if (currentFieldValue === fieldDefaultValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];   // target-field-type
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
                            let updateQuery: ObjectRefType = {};    // to determine the current-value in the target-field
                            let updateSet: ObjectRefType = {};      // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = fieldDefaultValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.deleteSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    for await (const currentRec of (this.currentRecs as Array<ObjectRefType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-null-task");
                            }
                            const targetDocDesc = cItem.targetModel.docDesc || {};
                            const docInitializeValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const nullValue = docInitializeValue[targetField] || null; // new value (null-value) of the targetField
                            if (currentFieldValue === nullValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
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
                            let updateQuery: ObjectRefType = {};
                            let updateSet: ObjectRefType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                // commit or abort trx
                if (removed.acknowledged && removed.deletedCount === docIds.length) {
                    await session.commitTransaction();
                } else {
                    await session.abortTransaction()
                    throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]`)
                }
            });
            // perform cache and audi-log tasks
            if (removed.acknowledged) {
                // delete cache
                deleteHashCache(this.cacheKey, this.coll);
                // check the audit-log settings - to perform audit-log
                let logRes = {code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: null};
                if (this.logDelete || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    }
                    logRes = await this.transLog.deleteLog(this.coll, logDocuments, this.userId);
                }
                const deleteResultValue: CrudResultType = {
                    recordsCount: removed.deletedCount,
                    logRes,
                }
                return getResMessage("success", {
                    message: "Document/record deleted successfully",
                    value  : deleteResultValue,
                });
            }
            return getResMessage("deleteError", {message: "No record(s) deleted"});
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }

    async removeRecordByParams(): Promise<ResponseMessage> {
        // delete/remove records and log in audit-collection
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            if (this.queryParams && !isEmptyObject(this.queryParams)) {
                // trx starts
                let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
                await session.withTransaction(async () => {
                    const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
                    removed = await appDbColl.deleteMany(this.queryParams, {session});
                    if (removed.deletedCount !== this.currentRecs.length) {
                        await session.abortTransaction();
                        throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]. Transaction aborted.`)
                    }
                    // optional, update child-collection-documents for setDefault and setNull/initialize-value?, if this.deleteSetDefault or this.deleteSetNull
                    if (this.deleteSetDefault && this.childRelations.length > 0) {
                        const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                        for await (const currentRec of (this.currentRecs as Array<ObjectRefType>)) {
                            for await (const cItem of childRelations) {
                                const sourceField = cItem.sourceField;
                                const targetField = cItem.targetField
                                // check if targetModel is defined/specified, required to determine default-action
                                if (!cItem.targetModel) {
                                    // handle as error
                                    await session.abortTransaction();
                                    throw new Error("Target model is required to complete the set-default-task");
                                }
                                const targetDocDesc = cItem.targetModel.docDesc || {};
                                const targetColl = cItem.targetModel.collName || cItem.targetColl;
                                // compute default values for the targetFields
                                const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                                const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                                const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                                if (currentFieldValue === fieldDefaultValue) {
                                    // skip update
                                    continue;
                                }
                                // validate targetField default value | check if setDefault is permissible for the targetField
                                let targetFieldDesc = targetDocDesc[targetField];
                                switch (typeof targetFieldDesc) {
                                    case "object":
                                        targetFieldDesc = targetFieldDesc as FieldDescType
                                        // handle non-default-field
                                        if (!Object.keys(targetFieldDesc).includes("defaultValue") || !targetFieldDesc.defaultValue) {
                                            await session.abortTransaction();
                                            throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                        }
                                        break;
                                    default:
                                        break;
                                }
                                let updateQuery: ObjectRefType = {};
                                let updateSet: ObjectRefType = {};
                                updateQuery[targetField] = currentFieldValue;
                                updateSet[targetField] = fieldDefaultValue;
                                const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                                const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                                if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                    await session.abortTransaction();
                                    throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                                }
                            }
                        }
                    } else if (this.deleteSetNull && this.childRelations.length > 0) {
                        const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                        for await (const currentRec of (this.currentRecs as Array<ObjectRefType>)) {
                            for await (const cItem of childRelations) {
                                const sourceField = cItem.sourceField;
                                const targetField = cItem.targetField;
                                // check if targetModel is defined/specified, required to determine allowNull-action
                                if (!cItem.targetModel) {
                                    // handle as error
                                    await session.abortTransaction();
                                    throw new Error("Target model is required to complete the set-null-task");
                                }
                                const targetDocDesc = cItem.targetModel.docDesc || {};
                                const docInitializeValue = this.computeInitializeValues(targetDocDesc)
                                const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                                const nullValue = docInitializeValue[targetField] || null; // new value (null-value) of the targetField
                                if (currentFieldValue === nullValue) {
                                    // skip update
                                    continue;
                                }
                                // validate targetField null value | check if allowNull is permissible for the targetField
                                const targetColl = cItem.targetModel.collName || cItem.targetColl;
                                let targetFieldDesc = targetDocDesc[targetField];
                                switch (typeof targetFieldDesc) {
                                    case "object":
                                        targetFieldDesc = targetFieldDesc as FieldDescType
                                        // handle non-null-field
                                        if (!Object.keys(targetFieldDesc).includes("allowNull") || !targetFieldDesc.allowNull) {
                                            await session.abortTransaction();
                                            throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                        }
                                        break;
                                    default:
                                        break;
                                }
                                let updateQuery: ObjectRefType = {};
                                let updateSet: ObjectRefType = {};
                                updateQuery[targetField] = currentFieldValue;
                                updateSet[targetField] = nullValue;
                                const TargetColl = this.dbClient.db(this.dbName).collection(targetColl);
                                const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                                if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                    await session.abortTransaction();
                                    throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                                }
                            }
                        }
                    }
                    // commit or abort trx
                    if (removed.acknowledged && removed.deletedCount === this.currentRecs.length) {
                        await session.commitTransaction();
                    } else {
                        await session.abortTransaction()
                        throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]`)
                    }
                });
                // perform cache and audi-log tasks
                if (removed.acknowledged) {
                    // delete cache
                    await deleteHashCache(this.cacheKey, this.coll);
                    // check the audit-log settings - to perform audit-log
                    let logRes = {
                        code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: null
                    };
                    if (this.logDelete || this.logCrud) {
                        const logDocuments: LogDocumentsType = {
                            collDocuments: this.currentRecs,
                        }
                        logRes = await this.transLog.deleteLog(this.coll, logDocuments, this.userId);
                    }
                    const deleteResultValue: CrudResultType = {
                        recordsCount: removed.deletedCount,
                        logRes,
                    }
                    return getResMessage("success", {
                        message: "Document/record deleted successfully",
                        value  : deleteResultValue,
                    });
                } else {
                    return getResMessage("deleteError", {message: "No record(s) deleted"});
                }
            } else {
                return getResMessage("deleteError", {message: "Unable to delete record(s), due to missing queryParams"});
            }
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }
}

// factory function/constructor
function newDeleteRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new DeleteRecord(params, options);
}

export {DeleteRecord, newDeleteRecord};
