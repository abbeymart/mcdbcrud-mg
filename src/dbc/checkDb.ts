/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-08-07
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: check-db connection / handle
 */

import { Db, MongoClient } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";

export function checkDb(dbConnect: Db): ResponseMessage {
    if (dbConnect && dbConnect.databaseName !== "") {
        return getResMessage("success", {
            message: "valid database connection/handler",
        });
    } else {
        return getResMessage("validateError", {
            message: "valid database connection/handler is required",
        });
    }
}

export function checkDbClient(dbc: MongoClient): ResponseMessage {
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
