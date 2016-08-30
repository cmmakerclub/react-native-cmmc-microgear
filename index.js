'use strict';

var React = require('react-native');

import {NETPIE} from 'react-native-netpie-mqtt-auth-generator'
var mqtt = require('react-native-mqtt');

var {
    NativeModules
} = React;



let callbacks = {}

class _MicroGear {
    _client = null;
    _appId = "";
    _appKey = "";
    _appSecret = "";

    _callbacks = {};

    constructor(opts) {
        this._appKey = opts.key;
        this._appSecret = opts.secret;
    }

    on(event, callback) {
        this._callbacks[event] = callback;
    }

    subscribe(topic, qos) {
        qos = qos || 0;
        console.log("subscribe...", topic);
        if (this._client) {
            console.log("SUB...");
            this._client.subscribe(topic, qos);
            return true;
        }
        else {
            return false;
        }
    }

    chat(to, msg, opts) {
        opts = opts|| {};
        let topic = "/" + this._appId + "/gearname/"  + to;
        let qos = opts.qos || 0;
        let retain = (opts.retain === undefined) || false;
        if (this._client) {
            this._client.publish(topic, msg, qos, retain);
            return true;
        }
        else {
            return false;
        }
    }

    connect(appId) {
        var that = this;
        this._appId = appId;

        NETPIE.config({
            appId: this._appId,
            appKey: this._appKey,
            appSecret: this._appSecret
        }, (err, res) => {
            if (err) {
                console.log(">> NETPIE ERROR", err, res);
                if (this._callbacks['error']) {
                    this._callbacks['error'](res);
                }
            }
            else {
                console.log("NETPIE CONNECTED", res);
                let opts = {
                    uri: 'mqtt://gb.netpie.io:1883',
                    clientId: res.mqtt_clientid,
                    user: res.mqtt_username,
                    pass: res.mqtt_password,
                    auth: true,
                    clean: true,
                };

                mqtt.createClient(opts).then(function (client) {
                    that._client = client;
                    client.on('closed', function () {
                        console.log('mqtt.event.closed');
                        let callback = that._callbacks['closed'];
                        if (callback) {
                            callback();
                        }
                    });

                    client.on('error', function (msg) {
                        let callback = that._callbacks['error'];
                        if (callback) {
                            callback(msg);
                        }
                    });

                    client.on('message', function (msg) {
                        let callback = that._callbacks['message'];
                        if (callback) {
                            callback(msg.topic, msg.data, msg);
                        }
                    });

                    client.on('connect', function () {
                        let callback = that._callbacks['connected'];
                        if (callback) {
                            callback(that._client);
                        }
                    });

                    client.connect();
                });
            }
        });
    }
}

var modules = {
    create: (opts) => {
        var _mg = new _MicroGear(opts);
        return _mg;
    },
}

module.exports = modules;
