/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-15 | @Updated: 2023-11-22, 2024-01-06
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg audit-log (mongodb) entry point | auditLog
 */

// Import required module/function
import { Db } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { checkDb } from "../dbc";
import { AuditLogTypes, AuditLogParamsType, LogRecordsType, ActionParamType } from "../crud";
import {isEmptyObject} from "../crud";

//types
export interface AuditParamsType {
    tableName?: string;
    logRecords?: LogRecordsType;
    newLogRecords?: LogRecordsType;
    logType?: string;
    logBy?: string;
    logAt?: Date | string;
}

class AuditLog {
    private readonly dbHandle: Db;
    private readonly auditTable: string;

    constructor(auditDb: Db, options?: AuditLogParamsType) {
        this.dbHandle = auditDb;
        this.auditTable = options && options.auditTable ? options.auditTable : "audits";
    }

    getAuditTable() {
        return this.auditTable
    }

    async createLog(userId: string, logParams: AuditLogParamsType): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.tableName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId && !logParams.logBy) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.logRecords) {
            errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                "Created record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : logParams.tableName,
                logRecords: logParams.logRecords,
                logType   : AuditLogTypes.CREATE,
                logBy     : logParams.logBy || userId,
                logAt     : new Date(),
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
            return getResMessage("logError", {
                value  : error.message,
                message: "Error saving create-audit record(s): " + error.message,
            });
        }
    }

    async updateLog(userId: string, logParams: AuditLogParamsType): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.tableName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId && !logParams.logBy) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.logRecords) {
            errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                "Current record(s) information is required.";
        }
        if (!logParams.newLogRecords) {
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
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName    : logParams.tableName,
                logRecords   : logParams.logRecords,
                newLogRecords: logParams.newLogRecords,
                logType      : AuditLogTypes.UPDATE,
                logBy        : logParams.logBy || userId,
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
            console.error("Error saving update-audit record(s): ", error);
            return getResMessage("logError", {
                message: "Error saving update-audit record(s): " + error.message,
            });
        }
    }

    async readLog(logParams: AuditLogParamsType, userId = ""): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        if (!logParams.tableName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!logParams.logRecords) {
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
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : logParams.tableName,
                logRecords: logParams.logRecords,
                logType   : AuditLogTypes.READ,
                logBy     : logParams.logBy || userId,
                logAt     : new Date(),
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

    async deleteLog(userId: string, logParams: AuditLogParamsType): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.tableName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId && !logParams.logBy) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.logRecords) {
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
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : logParams.tableName,
                logRecords: logParams.logRecords,
                logType   : AuditLogTypes.DELETE,
                logBy     : logParams.logBy || userId,
                logAt     : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            return getResMessage("logError", {
                message: "Error inserting delete-audit record(s):" + error.message,
            });
        }
    }

    async loginLog(logParams: AuditLogParamsType, userId = "", tableName = "users"): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }
        // validate params/values
        let errorMessage = "";
        if (!logParams.logRecords) {
            errorMessage = errorMessage + " | Login information is required."
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : logParams.tableName || tableName,
                logRecords: logParams.logRecords,
                logType   : AuditLogTypes.LOGIN,
                logBy     : userId,
                logAt     : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            return getResMessage("logError", {
                message: "Error inserting login-audit record(s):" + error.message,
            });
        }
    }

    async logoutLog(userId: string, logParams: AuditLogParamsType, tableName = "users"): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        if (!userId && !logParams.logBy) {
            errorMessage = errorMessage + " | userId is required."
        }
        if (!logParams.logRecords || isEmptyObject(logParams.logRecords)) {
            errorMessage = errorMessage + " | Logout information is required."
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : logParams.tableName || tableName,
                logRecords: logParams.logRecords,
                logType   : AuditLogTypes.LOGOUT,
                logBy     : logParams.logBy || userId,
                logAt     : new Date(),
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            return getResMessage("logError", {
                value: error,
            });
        }
    }

    async auditLog(logType: string, logParams: AuditLogParamsType, userId = ""): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let tableName = logParams.tableName,
            logRecords = logParams.logRecords,
            newLogRecords = logParams.newLogRecords,
            errorMessage = "",
            actionParams: ActionParamType = {};

        logType = logType.toLowerCase();

        switch (logType) {
            case "create":
            case AuditLogTypes.CREATE:
                // validate params/values
                if (!tableName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId && !logParams.logBy) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!logRecords) {
                    errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                        "Created record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    logRecords: logRecords,
                };
                break;
            case "update":
            case AuditLogTypes.UPDATE:
                // validate params/values
                if (!tableName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId && !logParams.logBy) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!logRecords) {
                    errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                        "Current record(s) information is required.";
                }
                if (!newLogRecords) {
                    errorMessage = errorMessage ? errorMessage + " | Updated record(s) information is required." :
                        "Updated record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    logRecords   : logRecords,
                    newLogRecords: newLogRecords,
                };
                break;
            case "remove":
            case "delete":
            case AuditLogTypes.DELETE:
            case AuditLogTypes.REMOVE:
                // Check/validate the attributes / parameters
                if (!tableName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId && !logParams.logBy) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!logRecords) {
                    errorMessage = errorMessage ? errorMessage + " | Deleted record(s) information is required." :
                        "Deleted record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    logRecords: logRecords,
                };
                break;
            case "read":
            case AuditLogTypes.GET:
            case AuditLogTypes.READ:
                // validate params/values
                if (!tableName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!logRecords) {
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
                    logRecords: logRecords,
                };
                break;
            case "login":
            case AuditLogTypes.LOGIN:
                // validate params/values
                if (!logRecords) {
                    errorMessage = errorMessage + " | Login information is required."
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    logRecords: logRecords,
                };
                break;
            case "logout":
            case AuditLogTypes.LOGOUT:
                // validate params/values
                if (!userId && !logParams.logBy) {
                    errorMessage = errorMessage + " | userId is required."
                }
                if (!logRecords || isEmptyObject(logRecords)) {
                    errorMessage = errorMessage + " | Logout information is required."
                }
                if (errorMessage) {
                    return getResMessage("paramsError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    logRecords: logRecords,
                };
                break;
            default:
                return getResMessage("logError", {
                    message: "Unknown log type and/or incomplete log information",
                });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                ...actionParams,
                ...{
                    tableName: tableName,
                    logType  : logType,
                    logBy    : logParams.logBy || userId,
                    logAt    : new Date(),
                },
            });

            if (result.acknowledged) {
                return getResMessage("success", {
                    value: result,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            return getResMessage("logError", {
                message: "Error inserting audit-log record(s):" + error.message,
            });
        }
    }

    async customLog(params: AuditParamsType): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!params.logRecords) {
            errorMessage = errorMessage ? errorMessage + " | Data / information to be logged is required." :
                "Data / information to be logged is required.";
        }
        if (!params.logBy) {
            errorMessage = errorMessage ? errorMessage + " | Log userId/name or owner required." :
                "Log userId/name or owner required.";
        }
        if (errorMessage) {
            return getResMessage("paramsError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection(this.auditTable);
            const result = await coll.insertOne({
                tableName : params.tableName ? params.tableName : "not-specified",
                logRecords: params.logRecords,
                logType   : params.logType,
                logBy     : params.logBy ? params.logBy : "not-specified",
                logAt     : new Date(),
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
            return getResMessage("logError", {
                value  : error.message,
                message: "Error saving create-audit record(s): " + error.message,
            });
        }
    }


}

function newAuditLog(auditDb: Db, logParams?: AuditLogParamsType) {
    return new AuditLog(auditDb, logParams);
}

export { AuditLog, newAuditLog };
