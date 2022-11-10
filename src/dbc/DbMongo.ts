/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-17
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg db-server-connect & db-handle for mongoDB
 */

import { Db, MongoClient } from "mongodb";
import { DbSecureType, DbOptionsType, DbParamsType } from "./types";

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
        // For a replica set, include the replica set name and a seedlist of the members in the URI string; e.g.
        // const uri = 'mongodb://mongodb0.example.com:27017,mongodb1.example.com:27017/?replicaSet=myRepl'
        // TODO: review and configure for replica-set
        this.dbUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database},${this.user}:${this.pass}@${dbConfig.host}:27027/${dbConfig.database},${this.user}:${this.pass}@${dbConfig.host}:27037/${dbConfig.database}/?replicaSet=rs0` :
            `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database},${dbConfig.host}:27027/${dbConfig.database},${dbConfig.host}:27037/${dbConfig.database}/?replicaSet=rs0`
        // this.dbUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` :
        //     `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
        this.serverUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database},${this.user}:${this.pass}@${dbConfig.host}:27027,${this.user}:${this.pass}@${dbConfig.host}:27037/?replicaSet=rs0` :
            `mongodb://${dbConfig.host}:${dbConfig.port},${dbConfig.host}:27027,${dbConfig.host}:27037/?replicaSet=rs0`
        // this.serverUrl = this.checkAccess ? `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}` :
        //     `mongodb://${dbConfig.host}:${dbConfig.port}`;
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
