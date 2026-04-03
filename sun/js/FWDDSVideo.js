/**
 * Distortion Slider PACKAGED v:1.0
 * Video class.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

import FWDDSDisplayObject from "./FWDDSDisplayObject";
import FWDDSUtils from "./FWDDSUtils";

export default class FWDDSVideo extends FWDDSDisplayObject{
    
    static ERROR = 'error';
    static START_TO_BUFFER = 'startToBuffer';
    static STOP_TO_BUFFER = 'stopToBuffer';
    static LOAD_PROGRESS = 'loadProgress';
    static UPDATE = 'update';
    static UPDATE_TIME = 'update_time';
    static START = 'start';
    static PLAY = 'play';
    static PAUSE = 'pause';
    static STOP = 'stop';
    static PLAY_COMPLETE = 'playComplete';
    static SAFE_TO_SCRUB = 'safeToScrub';
    static SHOW_UNMUTE = 'showUnmute';


     /*
     * Initialize.
     */
     constructor(prt){

        super();
        this.prt = prt;
        this.screen.className = 'fwdds-video';
        this._volume = 1;

        this.setupVideo();
     }


    /*
     * Setup video.
     */
    setupVideo(){
        if(this.video_el == null){
            this.video_el = document.createElement("video");
            this.video_el.className = 'fwdds-video-element';
            this.video_el.playsInline = 'true';
            this.screen.appendChild(this.video_el);
            this.video_el.controls = false;
            this.video_el.style.position = "absolute";
            this.video_el.style.left = "0px";
            this.video_el.style.top = "0px";
            this.video_el.style.width = "100%";
            this.video_el.style.height = "100%";
            this.video_el.style.margin = "0px";
            this.video_el.style.padding = "0px";
            this.video_el.style.maxWidth = "none";
            this.video_el.style.maxHeight = "none";
            this.video_el.style.border = "none";
            this.video_el.style.lineHeight = "0";
            this.video_el.style.msTouchAction = "none";
            this.screen.appendChild(this.video_el);
        }

        this.addEvents();       
    }


    /*
     * Add / remove eventsr.
     */
    addEvents(){
        this.errorHandler = this.errorHandler.bind(this);
        this.video_el.addEventListener("error", this.errorHandler);

        this.updateProgress = this.updateProgress.bind(this);
        this.video_el.addEventListener("progress", this.updateProgress);

        this.updateVideo = this.updateVideo.bind(this);
        this.video_el.addEventListener("timeupdate", this.updateVideo);

        this.pauseHandler = this.pauseHandler.bind(this);
        this.video_el.addEventListener("pause", this.pauseHandler);

        this.playHandler = this.playHandler.bind(this);
        this.video_el.addEventListener("play", this.playHandler);

        this.endedHandler = this.endedHandler.bind(this);
        this.video_el.addEventListener("ended", this.endedHandler);
    }

    removeEvents(){
        this.video_el.removeEventListener("error", this.errorHandler);
        this.video_el.removeEventListener("progress", this.updateProgress);
        this.video_el.removeEventListener("timeupdate", this.updateVideo);
        this.video_el.removeEventListener("pause", this.pauseHandler);
        this.video_el.removeEventListener("play", this.playHandler);
        this.video_el.removeEventListener("ended", this.endedHandler);
    }


    /*
     * Start/stop tobuffer handler.
     */
    startToBuffer = function(){
        this.dispatchEvent(FWDDSVideo.START_TO_BUFFER);
    };
    
    stopToBuffer = function(){
        this.dispatchEvent(FWDDSVideo.STOP_TO_BUFFER);
    };


    /*
     * Error handler.
     */
    errorHandler(e){
       
        let error;
        this.hasError_bl = true;
        
        if(this.video_el.networkState == 0){
            error = "Video error - networkState = 0";
        }else if(this.video_el.networkState == 1){
            error = "Video error networkState = 1";
        }else if(this.video_el.networkState == 3){
            error = 'Video not found -  <font color="#FF0000">' + this.src + '</font>';
        }else{
            error = e;
        }
        
        if(window.console) window.console.log(this.video_el.networkState);
        this.dispatchEvent(FWDDSVideo.ERROR, {text:error});
    };


    /*
     * Update progress.
     */
    updateProgress(){
        let buffered;
        let percentLoaded = 0;
        
        if(this.video_el.buffered.length > 0){
            buffered = this.video_el.buffered.end(this.video_el.buffered.length - 1);
            percentLoaded = buffered.toFixed(1)/this.video_el.duration.toFixed(1);
            if(isNaN(percentLoaded) || !percentLoaded) percentLoaded = 0;
        }
        
        this.dispatchEvent(FWDDSVideo.LOAD_PROGRESS, {percent:percentLoaded});
    };


    /*
     * Update video.
     */
    updateVideo(){
        let percentPlayed; 
        if (!this.allowScrubing) {
            percentPlayed = this.video_el.currentTime /this.video_el.duration;
            this.dispatchEvent(FWDDSVideo.UPDATE, {percent:percentPlayed});
        }
        
        if(this.video_el.currentTime && this.video_el.currentTime >= 0.1) this.safeToBeControlled();
    
        let totalTime = FWDDSUtils.formatTime(this.video_el.duration);
        let curTime = FWDDSUtils.formatTime(this.video_el.currentTime);
        
        if(!isNaN(this.video_el.duration)){
            this.dispatchEvent(FWDDSVideo.UPDATE_TIME, {curTime: curTime, totalTime:totalTime, seconds:Math.round(this.video_el.currentTime), totalTimeInSeconds:Math.round(this.video_el.duration)});
        }else{
            this.dispatchEvent(FWDDSVideo.UPDATE_TIME, {curTime:"00:00" , totalTime:"00:00", seconds:0});
        }
        
        this.lastPercentPlayed = percentPlayed;
        this.curDuration = curTime;
    };


    /*
     * Safe to be controlled.
     */
    safeToBeControlled(){
        if(!this.isSafeToBeControlled_bl){
            this.stopToScrub();
            this.hasHours_bl = Math.floor(this.video_el.duration / (60 * 60)) > 0;
            this.isPlaying_bl = true;
            this.isSafeToBeControlled_bl = true;
            this.dispatchEvent(FWDDSVideo.SAFE_TO_SCRUB);
        }
    };


    /*
     * Set source.
     */
    setSource(src){
        console.log('set sourceee')
        this.src = src;
        
        if(this.video_el) this.stop();
        this.initVideo();
    };


    /*
     * Init video.
     */
    initVideo(){
        this.isPlaying_bl = false;
        this.hasError_bl = false;
        this.allowScrubing = false;
        this.isStopped_bl = false;
        this.setupVideo();
        this.volume = this._volume;
        this.video_el.src = this.src;
    }


    /*
     * Play / pause / resume methods and handlers.
     */
    play(overwrite){
        let promise;

        if(this.isStopped_bl){
            this.initVideo();
            this.play();
            this.isPlaying_bl = true;
            this.startToBuffer();
            return;
        }else if(!this.video_el.ended || overwrite){
            try{
                this.hasError_bl = false;
                this.isStopped_bl = false;
                this.isPlaying_bl = true;
                promise = this.video_el.play();
                this.volume = this._volume;
            }catch(e){};
        }

        if (promise !== undefined) {
            promise.then(_ => {
                // Autoplay started!
                this.volume = 1;
            }).catch(error => {
                this.volume = 0;
                this.video_el.play();
                this.dispatchEvent(FWDDSVideo.SHOW_UNMUTE);
            });
        }
    };

    playHandler(){
        if(this.allowScrubing) return;
        
        this.hasPlayedOnce = true;

        if(!this.isStartEventDispatched_bl){
            this.dispatchEvent(FWDDSVideo.START);
            this.isStartEventDispatched_bl = true;
        }
        
        this.stopToBuffer();
        this.dispatchEvent(FWDDSVideo.PLAY);
    };

    pause(){
        if(this == null || this.isStopped_bl || this.hasError_bl) return;
        if(!this.video_el.ended){
            try{
                this.video_el.pause();
                this.isPlaying_bl = false;
                if(FWDDSUtils.isIE) this.dispatchEvent(FWDDSVideo.PAUSE);
            }catch(e){};
        }
    };

    pauseHandler(){
        if(this.allowScrubing) return;
        this.dispatchEvent(FWDDSVideo.PAUSE);
    };
    
    togglePlayPause(){
        if(this == null) return;
        if(!this.isSafeToBeControlled_bl) return;
        if(this.isPlaying_bl){
            this.pause();
        }else{
            this.play();
        }
    };

    resume = function(){
        if(this.isStopped_bl) return;
        this.play();
    };
    
    endedHandler(){
        this.dispatchEvent(FWDDSVideo.PLAY_COMPLETE);
    };
    

    /*
     * Scrub.
     */
    startToScrub = function(){
       this.allowScrubing = true;
    };
    
    stopToScrub = function(){
       this.allowScrubing = false;
    };
    
    scrubbAtTime = function(duration){
       this.video_el.currentTime = duration;
       let totalTime = FWDDSUtils.formatTime(_s.video_el.duration);
       let curTime = FWDDSUtils.formatTime(_s.video_el.currentTime);
       this.dispatchEvent(FWDDSVideo.UPDATE_TIME, {curTime: curTime, totalTime:totalTime});
    }
    
    scrub = function(percent, e){
        if(e)this.startToScrub();
        try{
            this.video_el.currentTime =this.video_el.duration * percent;
            let totalTime = FWDDSUtils.formatTime(Math.round(_s.video_el.duration));
            let curTime = FWDDSUtils.formatTime(Math.round(_s.video_el.currentTime));
            this.dispatchEvent(FWDDSVideo.UPDATE_TIME, {curTime: curTime, totalTime:totalTime});
        }catch(e){}
    };


    /*
     * Set volume.
     */
    set volume(volume){
        if(volume !=  undefined) this._volume = Math.max(Math.min(volume, 1), 0);
        if(this.video_el){
            this.video_el.volume = this._volume;
            if(volume) this.video_el.muted = false;
        }
    };

    get volume(){
        return this._volume;
    }

    /*
     * Stop.
     */
    stop(overwrite){
       
        if((this == null || this.video_el == null || this.isStopped_bl) && !overwrite) return;
        this.isPlaying_bl = false;
        this.isStopped_bl = true;
        this.isSafeToBeControlled_bl = false;
        this.isStartEventDispatched_bl = false;
        this.pause();
        this.removeEvents();
        this.video_el.src = '';
        
        this.dispatchEvent(FWDDSVideo.LOAD_PROGRESS, {percent:0});
        this.dispatchEvent(FWDDSVideo.UPDATE_TIME, {curTime:"00:00" , totalTime:"00:00"});
        this.dispatchEvent(FWDDSVideo.STOP);
        this.stopToBuffer();
    };

}