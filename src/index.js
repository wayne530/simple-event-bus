const allSettled = require('promise.allsettled');

function SimpleEventBus() {
    this.debug = false;
    this.onListeners = {};
    this.onAllListeners = [];
    this.onMatchListeners = {};

    this.setDebug = function(debug) {
        this.debug = debug;
    };

    this.log = function(message) {
        if (this.debug) {
            console.log(message);
        }
    };

    this.on = function(eventNameOrNames, callback) {
        const eventNames = typeof(eventNameOrNames) === 'string' ? [eventNameOrNames] : eventNameOrNames;
        eventNames.forEach(eventName => {
            if (! (eventName in this.onListeners)) {
                this.onListeners[eventName] = [];
            }
            this.onListeners[eventName].push(callback);
        });
    };

    this.onAll = function(callback) {
        this.onAllListeners.push(callback);
    };

    this.onMatch = function(eventNamePatternOrPatterns, callback) {
        const eventNamePatterns = typeof(eventNamePatternOrPatterns) === 'string' ?
            [eventNamePatternOrPatterns] :
            eventNamePatternOrPatterns;
        eventNamePatterns.forEach(eventNamePattern => {
            if (! (eventNamePattern in this.onMatchListeners)) {
                this.onMatchListeners[eventNamePattern] = [];
            }
            this.onMatchListeners[eventNamePattern].push(callback);
        });
    };

    this.trigger = async function(eventName, eventProperties, context) {
        eventProperties = eventProperties || {};
        context = context || {};
        let callbacks = [];
        this.log(`${eventName} triggered with properties: ${JSON.stringify(eventProperties)}`);
        if (eventName in this.onListeners) {
            callbacks = callbacks.concat(this.onListeners[eventName]);
        }
        for (let key in this.onMatchListeners) {
            if (this.onMatchListeners.hasOwnProperty(key)) {
                let pattern = new RegExp(key);
                if (eventName.match(pattern)) {
                    callbacks = callbacks.concat(this.onMatchListeners[key]);
                }
            }
        }
        callbacks = callbacks.concat(this.onAllListeners);
        this.log(`${callbacks.length} total callbacks to call`);

        // callback context
        let deferredTriggers = [];
        let callbackContext = Object.assign({}, context, {
            trigger: (eventName, eventProperties, context) => {
                deferredTriggers.push({ eventName, eventProperties, context });
            }
        });

        let callbackPromises = [];
        callbacks.forEach((callback) => {
            try {
                if (callback.constructor.name === 'AsyncFunction') {
                    const promise = callback.call(callbackContext, eventName, eventProperties, context);
                    callbackPromises.push(promise);
                } else {
                    callback.call(callbackContext, eventName, eventProperties, context);
                }
            } catch (error) {
                this.log(`Callback triggered exception: ${error.toString()}`);
                this.log(error);
            }
        });
        return allSettled(callbackPromises).then(results => {
            results.forEach(result => {
                if (result.status !== 'fulfilled') {
                    this.log(`Callback triggered exception: ${result.reason.toString()}`);
                    this.log(result.reason);
                }
            });
        }).then(() => {
            this.log(`${deferredTriggers.length} total deferred triggers from callbacks`);
            deferredTriggers.forEach(async (trigger) => {
                await this.trigger(trigger.eventName, trigger.eventProperties, trigger.context);
            });

            return true;
        });
    };
}

module.exports = SimpleEventBus;