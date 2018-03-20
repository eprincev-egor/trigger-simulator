"use strict";

// VERY OLD CODE

class Events {
    on(events, handler, once) {
        if ( !this._events ) {this._events = {};}

        if (!(events += "") || typeof handler !== "function")
            return this;

        var name = "", event;
        events = events.split(/\s+/);
        for (var i = 0, n = events.length; i < n; i++) {
            name = events[i];
            if (!(name += ""))
                continue;

            event = this._events[name] || [];

            event.push({
                once : !!once,
                callback : handler
            });
            this._events[name] = event;
        }

        return this;
    }

    once(events, handler) {
        return this.on(events, handler, true);
    }

    off(events, handler) {
        if ( !this._events ) {this._events = {};}

        if (!(events += ""))
            return this;

        var name = "",
            event,
            isFunc = typeof handler === "function",
            toSave;

        events = events.split(/\s+/);

        for (var i = 0, n = events.length; i < n; i++) {
            name = events[i];
            if (!name)
                continue;

            event = this._events[name] || [];
            if ( !isFunc ) {
                toSave = [];
            } else {
                toSave = [];
                for (var j = 0, m = event.length; j < m; j++) {
                    if (event[j].callback === handler)
                        continue;

                    toSave.push(event[j]);
                }
                event = toSave;
            }
            if ( toSave.length ) {
                this._events[name] = toSave;
            } else {
                delete this._events[name];
            }
        }

        return this;
    }

    trigger(events) {
        if ( !this._events ) {this._events = {};}

        if (typeof events != "string")
            return this;

        var name = "",
            args = [].slice.call(arguments, 1);

        events = events.split(/\s+/);

        for (var i = 0, n = events.length; i < n; i++) {
            name = events[i];
            if ( name === "" ) {
                continue;
            }

            if ( name != "*" ) {
                callStack(this, "*", [name].concat(args));
            }
            callStack(this, name, args);
        }

        return this;
    }

    triggerAll() {
        for (var name in this._events) {
            if ( name == "*" ) {
                continue;
            }
            callStack(this, name, arguments);
        }
        return this;
    }

    clearEvents() {
        this.stopListening();

        if ( this._eventsListeners ) {
            for (var i = 0, n = this._eventsListeners.length; i < n; i++) {
                var listenerInfo = this._eventsListeners[ i ];
                if ( !listenerInfo || !listenerInfo.listener ) {
                    continue;
                }
                listenerInfo.listener.stopListening(this);
            }
        }
        delete this._eventsListeners;
        this._events = {};
        return this;
    }

    listenTo(speaker, events, handler) {
        if ( !this._eventsSpeakers ) {this._eventsSpeakers = [];}

        if ( events == "all" ) {
            events = "all *";
        }

        var context = this;

        if ( typeof handler != "function" ) {
            handler = function(){};
        }

        events = events.split(/\s+/);

        for (var i = 0, n = events.length; i < n; i++) {
            var eventName = events[i];
            var speakerInfo = {
                speaker: speaker,
                event: eventName,
                handler: handler.bind(context)
            };

            speaker.on(eventName, speakerInfo.handler);
            this._eventsSpeakers.push(speakerInfo);

            if ( speaker instanceof Events ) {
                if ( !speaker._eventsListeners ) {
                    speaker._eventsListeners = [];
                }
                speaker._eventsListeners.push({listener: this, event: eventName});
            }
        }
    }

    stopListening(speakerToOff, eventsToOff) {
        if ( typeof speakerToOff == "string" ) {
            eventsToOff = speakerToOff;
            speakerToOff = false;
        }

        if ( typeof eventsToOff == "string" ) {
            eventsToOff = eventsToOff.trim().split(/\s+/);
        } else {
            eventsToOff = false;
        }

        var oldSpeakers = this._eventsSpeakers || [];
        var newSpeakers = [];

        oldSpeakers.forEach(function(speakerInfo) {
            var speaker = speakerInfo && speakerInfo.speaker;
            if (
            // invalid info
                !speaker ||
					// stopListening(someObject) and is wrong object
					speakerToOff && speaker !== speakerToOff ||
					// stopListening("eventName") and is wrong eventName
					eventsToOff && eventsToOff.indexOf( speakerInfo.event ) == -1
            ) {
                // save speakerInfo
                newSpeakers.push( speakerInfo );
                return;
            }

            // drop handler
            speaker.off(speakerInfo.event, speakerInfo.handler);
            if ( speaker._eventsListeners ) {
                for (var i = 0, n = speaker._eventsListeners.length; i < n; i++) {
                    var listenerInfo = speaker._eventsListeners[ i ];

                    if (
                        listenerInfo.listener === this &&
							listenerInfo.event == speakerInfo.event
                    ) {
                        speaker._eventsListeners.splice(i, 1);
                        break;
                    }
                }
            }
        }, this);

        this._eventsSpeakers = newSpeakers;

        return this;
    }

    destroy() {
        this.clearEvents();
    }
}

function callStack(context, name, args) {
    var data,
        stack = context._events[name];

    if ( !stack ) {
        return;
    }

    for (var i = 0, n = stack.length; i < n; i++) {
        data = stack[i];

        data.callback.apply(context, args);
        if ( data.once ) {
            stack.splice(i, 1);
            i--;
            n--;
        }
    }

    if ( !stack.length ) {
        delete context._events[name];
    }
}
    
module.exports = Events;
