/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-15, 2023-11-22
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg audit-log (mongodb) entry point | auditLog
 */

// Import required module/function
import {Db} from "mongodb";
import {getResMessage, ResponseMessage} from "@mconnect/mcresponse";
import {checkDb} from "../dbc";
import {AuditLogTypes, AuditLogOptionsType, LogDocumentsType} from "../crud";
import { isEmptyObject } from "../orm";

//types
export interface AuditParamsType {
    collName?: string;
    collDocuments: any;
    newCollDocuments?: any;
    logType: string;
    logBy?: string;
    logAt?: Date;
}

class AuditLog {
    private readonly dbHandle: Db;
    private readonly auditColl: string;

    constructor(auditDb: Db, options?: AuditLogOptionsType) {
        this.dbHandle = auditDb;
        this.auditColl = options && options.auditColl ? options.auditColl : "audits";
    }

    getAuditColl() {
        return this.auditColl
    }

    async createLog(collName: string, collDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        // if (!userId) {
        //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
        //         "userId is required.";
        // }
        if (!collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                "Created record(s) information is required.";
        }
        if (errorMessage) {
            console.log("error-message: ", errorMessage);
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collName     : collName,
                collDocuments: collDocuments,
                logType      : "create",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError", {
                    value  : result || "no-result",
                    message: "no response from the server",
                });
            }
        } catch (error) {
            console.log("Error saving create-audit record(s): ", error);
            return getResMessage("logError", {
                value  : error.message,
                message: "Error saving create-audit record(s): " + error.message,
            });
        }
    }

    async updateLog(collName: string, collDocuments: LogDocumentsType, newCollDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        // if (!userId) {
        //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
        //         "userId is required.";
        // }
        if (!collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                "Current record(s) information is required.";
        }
        if (!newCollDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Updated record(s) information is required." :
                "Updated record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collName        : collName,
                collDocuments   : collDocuments,
                newCollDocuments: newCollDocuments,
                logType         : "update",
                logBy           : userId,
                logAt           : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.error("Error saving update-audit record(s): ", error);
            return getResMessage("logError", {
                message: "Error saving update-audit record(s): " + error.message,
            });
        }
    }

    async readLog(collName: string, collDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        if (!collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!collDocuments) {
            errorMessage = errorMessage ?
                errorMessage + " | Search keywords or Read record(s) information is required." :
                "Search keywords or Read record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collName     : collName,
                collDocuments: collDocuments,
                logType      : "read",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.error("Error inserting read/search-audit record(s): ", error);
            return getResMessage("logError", {
                message: "Error inserting read/search-audit record(s):" + error.message,
            });
        }
    }

    async deleteLog(collName: string, collDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        // if (!userId) {
        //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
        //         "userId is required.";
        // }
        if (!collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Deleted record(s) information is required." :
                "Deleted record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collName     : collName,
                collDocuments: collDocuments,
                logType      : "remove",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error saving delete-audit record(s): ", error);
            return getResMessage("logError", {
                message: "Error inserting delete-audit record(s):" + error.message,
            });
        }
    }

    async loginLog(collDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }
        // validate params/values
        let errorMessage = "";
        if (!collDocuments) {
            errorMessage = errorMessage + " | Login information is required."
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collDocuments: collDocuments,
                logType      : "login",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error inserting login-audit record(s): ", error);
            return getResMessage("logError", {
                message: "Error inserting login-audit record(s):" + error.message,
            });
        }
    }

    async logoutLog(collDocuments: LogDocumentsType, userId: string = "not-specified"): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        // if (!userId) {
        //     errorMessage = errorMessage + " | userId is required."
        // }
        if (!collDocuments || isEmptyObject(collDocuments)) {
            errorMessage = errorMessage + " | Logout information is required."
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collDocuments: collDocuments,
                logType      : "logout",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error inserting logout-audit record(s): ", error);
            return getResMessage("logError", {
                value: error,
            });
        }
    }

    async auditLog(logType: string, userId: string = "not-specified", options?: AuditLogOptionsType): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let collName = "",
            collDocuments = null,
            newCollDocuments = null,
            errorMessage = "",
            actionParams = {};

        logType = logType.toLowerCase();

        switch (logType) {
            case "create":
            case AuditLogTypes.CREATE:
                collName = options && options.collName ? options.collName : "";
                collDocuments = options && options.collDocuments ? options.collDocuments : null;
                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                // if (!userId) {
                //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
                //         "userId is required.";
                // }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                        "Created record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    tableName : collName,
                    logRecords: collDocuments,
                    logType   : logType,
                    logBy     : userId,
                };
                break;
            case "update":
            case AuditLogTypes.UPDATE:
                collName = options && options.collName ? options.collName : "";
                collDocuments = options && options.collDocuments ? options.collDocuments : null;
                newCollDocuments = options && options.newCollDocuments ? options.newCollDocuments : null; // object or array

                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                // if (!userId) {
                //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
                //         "userId is required.";
                // }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                        "Current record(s) information is required.";
                }
                if (!newCollDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Updated record(s) information is required." :
                        "Updated record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    tableName    : collName,
                    logRecords   : collDocuments,
                    newLogRecords: newCollDocuments,
                    logType      : logType,
                    logBy        : userId,
                };
                break;
            case "remove":
            case "delete":
            case AuditLogTypes.DELETE:
            case AuditLogTypes.REMOVE:
                collName = options && options.collName ? options.collName : "";
                collDocuments = options && options.collDocuments ? options.collDocuments : null;

                // Check/validate the attributes / parameters
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                // if (!userId) {
                //     errorMessage = errorMessage ? errorMessage + " | userId is required." :
                //         "userId is required.";
                // }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Deleted record(s) information is required." :
                        "Deleted record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    tableName : collName,
                    logRecords: collDocuments,
                    logType   : logType,
                    logBy     : userId,
                };
                break;
            case "read":
            case AuditLogTypes.GET:
            case AuditLogTypes.READ:
                collName = options && options.collName ? options.collName : "";
                collDocuments = options && options.collDocuments ? options.collDocuments : null;

                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!collDocuments) {
                    errorMessage = errorMessage ?
                        errorMessage + " | Search keywords or Read record(s) information is required." :
                        "Search keywords or Read record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    tableName : collName,
                    logRecords: collDocuments,
                    logType   : logType,
                    logBy     : userId,
                };
                break;
            case "login":
            case AuditLogTypes.LOGIN:
                collDocuments = options && options.collDocuments ? options.collDocuments : null;

                // validate params/values
                if (!collDocuments) {
                    errorMessage = errorMessage + " | Login information is required."
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    logRecords: collDocuments,
                    logType   : logType,
                    logBy     : userId,
                };
                break;
            case "logout":
            case AuditLogTypes.LOGOUT:
                collDocuments = options && options.collDocuments ? options.collDocuments : null;

                // validate params/values
                // if (!userId) {
                //     errorMessage = errorMessage + " | userId is required."
                // }
                if (!collDocuments || isEmptyObject(collDocuments)) {
                    errorMessage = errorMessage + " | Logout information is required."
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    logRecords: collDocuments,
                    logType   : logType,
                    logBy     : userId,
                };
                break;
            default:
                return getResMessage("logError", {
                    message: "Unknown log type and/or incomplete log information",
                });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                ...actionParams,
                ...{logAt: new Date()},
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error saving audit-log record(s): ", error);
            return getResMessage("logError", {
                message: "Error inserting audit-log record(s):" + error.message,
            });
        }
    }

    async customLog(params: AuditParamsType): Promise<ResponseMessage<any>> {
        const dbCheck = checkDb(this.dbHandle);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!params.collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Data / information to be logged is required." :
                "Data / information to be logged is required.";
        }
        if (!params.logBy) {
            errorMessage = errorMessage ? errorMessage + " | Log userId/name or owner required." :
                "Log userId/name or owner required.";
        }
        if (errorMessage) {
            console.log("error-message: ", errorMessage);
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditColl);
            const result = await coll.insertOne({
                collName     : params.collName? params.collName : "not-specified",
                collDocuments: params.collDocuments,
                logType      : params.logType,
                logBy        : params.logBy? params.logBy : "not-specified",
                logAt        : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError", {
                    value  : result || "no-result",
                    message: "no response from the server",
                });
            }
        } catch (error) {
            console.log("Error saving create-audit record(s): ", error);
            return getResMessage("logError", {
                value  : error.message,
                message: "Error saving create-audit record(s): " + error.message,
            });
        }
    }


}

function newAuditLog(auditDb: Db, options?: AuditLogOptionsType) {
    return new AuditLog(auditDb, options);
}

export {AuditLog, newAuditLog};
