/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2023-11-23
 * Updated 2018-04-08, prototype-to-class
 * @Company: mConnect.biz | @License: MIT
 * @Description: delete one or more records / documents by docIds or queryParams
 */

// Import required module/function(s)
import { ObjectId, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "../orm";
import { deleteHashCache } from "@mconnect/mccache";
import Crud from "./Crud";
import {
    CrudOptionsType, CrudParamsType, CrudResultType, LogDocumentsType, ObjectRefType, SubItemsType
} from "./types";
import { RelationActionTypes } from "../orm";

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
        if (this.docIds.length < 1) {
            return getResMessage("deleteError", {message: "Valid document-ID(s) required"});
        }
        // delete/remove records and log in audit-collection
        try {
            const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
            // id(s): convert string to ObjectId
            const docIds = this.docIds.map(id => new ObjectId(id));
            const removed = await appDbColl.deleteMany({
                _id: {
                    $in: docIds,
                }
            },);
            if (!removed.acknowledged || removed.deletedCount < 1) {
                throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} removed]`)
            }
            // perform delete cache and audit-log tasks
            deleteHashCache(this.cacheKey, this.coll);
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
                message: `Delete task completed - [${removed.deletedCount} of ${this.currentRecs.length} removed] `,
                value  : deleteResultValue,
            });
        } catch (e) {
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async removeRecordByParams(): Promise<ResponseMessage> {
        if (!this.queryParams || isEmptyObject(this.queryParams)) {
            return getResMessage("deleteError", {message: "Valid queryParams required"});
        }
        // delete/remove records and log in audit-collection
        try {
            const appDbColl = this.dbClient.db(this.dbName).collection(this.coll);
            const removed = await appDbColl.deleteMany(this.queryParams,);
            if (!removed.acknowledged || removed.deletedCount < 1) {
                throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} removed]`)
            }
            // perform delete cache and audit-log tasks
            deleteHashCache(this.cacheKey, this.coll);
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
                message: `Delete task completed - [${removed.deletedCount} of ${this.currentRecs.length} removed] `,
                value  : deleteResultValue,
            });
        } catch (e) {
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }
}

// factory function/constructor
function newDeleteRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new DeleteRecord(params, options);
}

export { DeleteRecord, newDeleteRecord };
