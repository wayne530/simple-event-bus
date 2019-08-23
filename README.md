# simple-event-bus

This is a very simple, pure Javascript (zero native dependencies) implementation of an event bus used to implement the
publisher-subscriber pattern in NodeJS applications.

## Installation

```
npm install --save wayne530/simple-event-bus#master
```

## Basic Use Case

```javascript
const SimpleEventBus = require('simple-event-bus');
const eventBus = new SimpleEventBus();
eventBus.setDebug(true); // enable debugging output (defaults to false)
eventBus.on('SomeEvent', function(eventName, eventProperties, context) {
    console.log(`I received event ${eventName} with properties: ${JSON.stringify(eventProperties)`);
});
eventBus.trigger('SomeEvent', { foo: 'bar', bar: 'baz' }).then(() => {
    // code here is executed after trigger and all callbacks and deferred callbacks have executed
    // omit .then() if you want to fire and forget
});
```

## Callback functions

The property `context` in the callback is set for the callback function, but this only works if you use normal
function declarations, such as `function(...) { ... }`. If you use arrow functions, such as `(...) => { ... }`, it is
not possible for the caller to override `this`, which is set by Javascript automatically. Therefore, for most reliable
use, avoid the use of arrow functions. In addition to the supplied `context`, we also mix-in a method `trigger` for
triggering nested events. See advanced use case below.

Callback functions may also be synchronous or asynchronous. The `trigger` method always returns a Promise chain.

## Advanced Use Case

The `context` parameter allows you to pass additional properties to the callback function that are not part of the event
metadata. This could provide shared context, such as access to database or third-party clients that have already been
initialized, or other data that might be useful in the processing of a callback. Passing `context` is optional. In
addition to the provided `context`, if any, we also mix-in a function `trigger`, with the same prototype as the method
available on event bus instances. This allows a callback to trigger additional, cascading events. Note, that these
nested `trigger` calls are _deferred_. That is, the original event trigger will complete calling all callbacks first
before triggering the nested calls.

```javascript
const SimpleEventBus = require('simple-event-bus');
const eventBus = new SimpleEventBus();
eventBus.setDebug(true); // enable debugging output (defaults to false)
eventBus.on('SomeOtherEvent', function(eventName) {
    console.log(`SomeOtherEvent was triggered!`);
});
eventBus.on('SomeEvent', function(eventName, eventProperties) {
    console.log(`I received event ${eventName} with properties: ${JSON.stringify(eventProperties)`);
    this.trigger('SomeOtherEvent');
    console.log(`${this.baz} <- should print: some value`);
});
eventBus.on('SomeEvent', function(eventName) {
    console.log(`Callback registration order is preserved. This is the second callback for SomeEvent!`);
});
eventBus.trigger('SomeEvent', { foo: 'bar', bar: 'baz' }, { baz: 'some value' }).then(() => {
    console.log(`Trigger executation chain completed!`);
});
```

### Output

```
I received event SomeEvent with properties: {"foo":"bar","bar":"baz"}
some value <- should print: some value
Callback registration order is preserved. This is the second callback for SomeEvent!
SomeOtherEvent was triggered!
Trigger executation chain completed!
```

Notice, the first callback for `SomeEvent` has a nested `trigger` call, but it is not executed right away. It is deferred
until the callback loop for the original, top-level `trigger` has completed, then these _deferred_ triggers are executed.

## Subscribing to Events

### `on`

The `on` method, as demonstrated above, allows you to bind to a single event, the string value of which is provided as the
first argument. It also accepts an array of events:

```javascript
eventBus.on(['Event1', 'Event2'], callback);
```

This will register `callback` for both `Event1` and `Event2`.

### `onAll`

The `onAll` method allows you to bind a callback to be executed for all triggered events. This might be useful, for example,
if you wish to capture all events and persist them to a database, or funnel them to [Segment](https://segment.com) or similar
service, or to AWS SQS or Kinesis for ETL or archival purposes. `onAll` callbacks are always executed after more specific
subscriptions, such as `on` and `onMatch`.

```javascript
eventBus.onAll(function(eventName, eventProperties) {
    // propagate to Segment
    analytics.track({ event: eventName, properties: eventProperties });
});
eventBus.onAll(async function(eventName, eventProperties) {
    // persist all events to the database - this is an asynchronous callback; this.db comes from `context` that is provided at `trigger`-time
    return this.db.models.Event.create({ event: eventName, properties: eventProperties });
});
```

### `onMatch`

`onMatch` allows you to register a regular expression with a callback, which will be executed any time an event with a name
matching the pattern is triggered. The pattern should be provided as a string and should omit the leading and trailing `/`
characters that typically define a Javascript regular expression. Matching is case sensitive and curently there are no options
to make it case-insensitive.

```javascript
eventBus.onMatch('^User', function(eventName, eventProperties) {
    console.log(`${eventName} triggered: I match all events beginning with User`);
});
```

As with `on`, you may provide a single regular expression or multiple, by passing in an array of patterns.

```javascript
eventBus.onMatch(['^User', 'Created$'], function(eventName, eventProperties) {
    console.log(`${eventName} triggered: I match all events beginning with User or ending with Created`);
});
```
