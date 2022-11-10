/**
 * @Author: abbeymart | Abi Akindele | @Created: 2021-06-12
 * @Company: Copyright 2021 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: module/package description
 */

import {MongoClientOptions} from "mongodb"

export interface DbSecureType {
    secureAccess: boolean;
    secureCert?: string;
    secureKey?: string;
}

export interface DbOptionsType extends MongoClientOptions{
    checkAccess?: boolean;
    poolSize?: number;
    reconnectTries?: number;
    reconnectInterval?: number;
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
}

export interface DbParamsType {
    host?: string;
    username?: string;
    password?: string;
    database?: string;
    filename?: string;
    location?: string;      // => URI
    port?: number | string;
    poolSize?: number;
    secureOption?: DbSecureType;
    uri?: string;
    timezone?: string
}
