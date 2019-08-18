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

    this.on = function(eventName, callback) {
        if (! (eventName in this.onListeners)) {
            this.onListeners[eventName] = [];
        }
        this.onListeners[eventName].push(callback);
    };

    this.onAll = function(callback) {
        this.onAllListeners.push(callback);
    };

    this.onMatch = function(eventNamePattern, callback) {
        if (! (eventNamePattern in this.onMatchListeners)) {
            this.onMatchListeners[eventNamePattern] = [];
        }
        this.onMatchListeners[eventNamePattern].push(callback);
    };

    this.trigger = function(eventName, eventProperties, context) {
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

        callbacks.forEach((callback) => {
            try {
                callback.call(callbackContext, eventName, eventProperties, context);
            } catch (error) {
                this.log(`Callback triggered exception: ${error.toString()}`);
                this.log(error);
            }
        });
        this.log(`${deferredTriggers.length} total deferred triggers from callbacks`);

        deferredTriggers.forEach((trigger) => {
            this.trigger(trigger.eventName, trigger.eventProperties, trigger.context);
        });
    };
}

module.exports = SimpleEventBus;