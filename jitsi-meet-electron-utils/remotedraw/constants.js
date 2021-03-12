module.exports = {
    /**
     * Types of remote-draw events.
     */
    EVENTS: {
        mousemove: "mousemove",
        mousedown: "mousedown",
        mouseup: "mouseup",
        stop: "stop",
        supported: "supported"
    },

    /**
     * Mouse actions mapping between the values in remote draw mouse event and
     * robotjs methods.
     */
    MOUSE_ACTIONS_FROM_EVENT_TYPE: {
        mousedown: "down",
        mouseup: "up"
    },
    
    /**
     * Mouse button mapping between the values in remote control mouse event and
     * robotjs methods.
     */
    MOUSE_BUTTONS: {
        1: "left",
        2: "middle",
        3: "right"
    },

    /**
     * The name of remote draw messages.
     */
    REMOTE_DRAW_MESSAGE_NAME: "remote-draw",

    /**
     * Types of remote-draw requests.
     */
    REQUESTS: {
        start: "start"
    },

    SCREEN_SHARE_DRAW_EVENTS_CHANNEL: 'jitsi-screen-sharing-draw-marker',
};
