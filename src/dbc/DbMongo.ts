/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-17
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg db-server-connect & db-handle for mongoDB
 */

import { Db, MongoClient } from "mongodb";
import { DbSecureType, DbOptionsType, DbParamsType, Replicas, defaultReplicas, } from "./types";

export class DbMongo {
    private readonly host: string;
    private readonly username: string;
    private readonly password: string;
    private readonly database: string;
    private readonly location: string;
    private readonly port: number;
    private readonly poolSize: number;
    private readonly secureOption: DbSecureType;
    private serverUrl: string;
    private readonly dbUrl: string;
    private readonly options: DbOptionsType;
    private readonly checkAccess: boolean;
    private readonly user: string;
    private readonly pass: string;
    private dbConnect?: MongoClient;
    private replicaName: string
    private replicas: Replicas;

    constructor(dbConfig: DbParamsType, options?: DbOptionsType) {
        this.host = dbConfig?.host || "";
        this.username = dbConfig?.username || "";
        this.password = dbConfig?.password || "";
        this.database = dbConfig?.database || "";
        this.location = dbConfig?.location || "";
        this.port = Number(dbConfig?.port) || Number.NEGATIVE_INFINITY;
        this.poolSize = dbConfig?.poolSize || 20;
        this.secureOption = dbConfig?.secureOption || {secureAccess: false, secureCert: "", secureKey: ""};
        this.checkAccess = options?.checkAccess !== false;
        this.user = encodeURIComponent(this.username);
        this.pass = encodeURIComponent(this.password);
        this.replicas = dbConfig.replicas || [];
        this.replicaName = dbConfig.replicaName || "";
        // set default dbUrl and serverUrl - standard standalone DB
        this.dbUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` : 
        `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
        this.serverUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}` : 
        `mongodb://${dbConfig.host}:${dbConfig.port}`;
        // For replica set, include the replica set hostUrl/name and a seedlist of the members in the URI string
        if (this.replicas.length > 0 && this.replicaName !== "") {
            // check and set access
            if (this.checkAccess) {
                // this.dbUrl = `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database},`
                this.dbUrl = `mongodb://`
                this.serverUrl = `mongodb://`
                // compute the replica-uris
                let repCount = 0;
                const repLength = this.replicas.length
                for (const rep of this.replicas) {
                    repCount += 1
                    this.dbUrl = `${this.dbUrl}${this.user}:${this.pass}@${rep.hostUrl}/${dbConfig.database}`
                    this.serverUrl = `${this.serverUrl}${this.user}:${this.pass}@${rep.hostUrl}`
                    if (repCount < repLength) {
                        this.dbUrl = `${this.dbUrl},`
                        this.serverUrl = `${this.serverUrl},`
                    }
                }
                // include the replicaSet name
                this.dbUrl = `${this.dbUrl}/?replicaSet=${this.replicaName}`
                this.serverUrl = `${this.serverUrl}/?replicaSet=${this.replicaName}`
            } else {
                // this.dbUrl = `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database},`
                this.dbUrl = `mongodb://`
                this.serverUrl = `mongodb://`
                // compute the replica-uris
                let repCount = 0;
                const repLength = this.replicas.length
                for (const rep of this.replicas) {
                    repCount += 1
                    this.dbUrl = `${this.dbUrl}${rep.hostUrl}/${dbConfig.database}`
                    this.serverUrl = `${this.serverUrl}${rep.hostUrl}`
                    if (repCount < repLength) {
                        this.dbUrl = `${this.dbUrl},`
                        this.serverUrl = `${this.serverUrl},`
                    }
                }
                // include the replicaSet name
                this.dbUrl = `${this.dbUrl}/?replicaSet=${this.replicaName}`
                this.serverUrl = `${this.serverUrl}/?replicaSet=${this.replicaName}`
            }
        }
        this.options = {
            poolSize          : options?.poolSize || this.poolSize,
            useNewUrlParser   : options?.useNewUrlParser || true,
            useUnifiedTopology: options?.useUnifiedTopology || true,
            // reconnectTries    : options?.reconnectTries || Number.MAX_VALUE,
            // reconnectInterval : options?.reconnectInterval || 1000,
        };
    }

    get dbUri(): string {
        return this.dbUrl;
    }

    get serverUri(): string {
        return this.serverUrl;
    }

    async connectServer(): Promise<MongoClient> {
        try {
            return await this.mgServer();
        } catch (e) {
            throw new Error("MongoDB server connection error:" + e.message);
        }
    }

    async openDb(dbName = ""): Promise<Db> {
        try {
            return await this.dbHandle(dbName);
        } catch (e) {
            throw new Error("MongoDB opening error:" + e.message);
        }
    }

    async closeDb() {
        await this.dbConnect?.close();
    }

    async mgServer(): Promise<MongoClient> {
        const dbenv = process.env.NODE_ENV || "development";
        if (dbenv === "production" && process.env.MONGODB_URI) {
            this.serverUrl = process.env.MONGODB_URI;
        }
        try {
            const client = new MongoClient(this.serverUrl, this.options);
            this.dbConnect = await client.connect();
            return this.dbConnect;
        } catch (err) {
            await this.dbConnect?.close();
            console.error("MongoDB server connection error:" + err.stack);
            throw new Error("MongoDB server connection error:" + err.message);
        }

    }

    async dbHandle(dbName = ""): Promise<Db> {
        let client: MongoClient;
        try {
            // connect to the server (pool connections)
            client = await this.mgServer();
            return client.db(dbName || this.database);
        } catch (err) {
            await this.dbConnect?.close();
            console.error("MongoDB connection error:" + err.stack);
            throw new Error("Error opening/creating a mongo database handle | " + err.message);
        }
    }
}

export function newDbMongo(dbConfig: DbParamsType, options?: DbOptionsType) {
    return new DbMongo(dbConfig, options);
}
