/**
 * Distortion Slider PACKAGED v:1.0
 * Event Dispatcher.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

export default class FWDDSEventDispather {


    // Initialize.
    constructor() {
        this.listeners = [];   
    }


    // Add event listener.
    addEventListener(type, listener) {
        if(type == undefined) throw Error("Type is required.");
        if(typeof type === "object") throw Error("Type must be of type String.");
        if(typeof listener != "function") throw Error("Listener must be of type Function." + type);
        
        var event = {};
        event.type = type;
        event.listener = listener;
        event.target = this;
        this.listeners.push(event);
    }
    

    // Remove event listener.
    removeEventListener(type, listener) {
        if(type == undefined) throw Error("Type is required.");
        if(typeof type === "object") throw Error("Type must be of type String.");
        if(typeof listener != "function") throw Error("Listener must be of type Function." + type);
        
        for (var i=0, len=this.listeners.length; i < len; i++){
            if(this.listeners[i].target === this 
                    && this.listeners[i].type === type
                    && this.listeners[i].listener ===  listener
            ){
                this.listeners.splice(i,1);
                break;
            }
        }  
    }
    

    // Dispatch event listener.
    dispatchEvent(type, props) {
        if(this.listeners == null) return;
        if(type == undefined) throw Error("Type is required.");
        if(typeof type === "object") throw Error("Type must be of type String.");
        
        for (var i=0, len=this.listeners.length; i < len; i++){
            if(this.listeners[i].target === this && this.listeners[i].type === type){		
                if(props){
                    for(var prop in props){
                        this.listeners[i][prop] = props[prop];
                    }
                }
                this.listeners[i].listener.call(this, this.listeners[i]);
            }
        }
    }

}