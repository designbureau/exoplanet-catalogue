/**
 * Distortion Slider PACKAGED v:1.0
 * Distortion Slider object.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

import FWDDSDisplayObject from "./FWDDSDisplayObject";
import FWDDSEventDispather from "./FWDDSEventDispather";
import FWDDSUtils from "./FWDDSUtils";
import FWDDSData from "./FWDDSData";
import FWDDSImageManager from "./FWDDSImageManager";
import FWDDSVideo from "./FWDDSVideo"

export default class FWDDS extends FWDDSEventDispather{

    static RESPONSIVE = "responsive";
	static AFTER_PARENT = "afterparent";

    /*
     * Initialize
     */
    constructor(settings){
      
        super();
        this.settings = settings;
        
        // Set instance name.
        this.instance = settings.instance;
        window[this.instance] = this;

        if(!FWDDS.mainAR){
            FWDDS.mainAR = []
        }
        FWDDS.mainAR.push(this);
     
     

        // Set display type.
        this.displayType = settings.displayType || FWDDS.RESPONSIVE;
		if(this.displayType.toLowerCase() != FWDDS.RESPONSIVE 
        && this.displayType.toLowerCase() != FWDDS.AFTER_PARENT){
                this.displayType = FWDDS.RESPONSIVE;
        }
        this.displayType = this.displayType.toLowerCase();
       
        // Set parent.
        if(settings.parentId === undefined){
            alert("Distortion Slider container parentId property is not found in the settings! ");
            return;
        }

        this.stageContainer = FWDDSUtils.getChildById(settings.parentId);   
        if(!this.stageContainer){
            alert("Distortion Slider container holder div is not found, please make sure that the container holder div exsists and the id is correct! " + settings.parentId);
            return;
        }
        this.stageContainer.style.position = 'relative';

        // Set various properties.
        this.fontIcon = this.settings.fontIcon || 'fwddsicon';
        this.backgroundColor = settings.backgroundColor || '#1a1a1a';
        this.maxWidth = settings.maxWidth || 1000;
        this.maxHeight = settings.maxHeight || 700; 
        this.autoScale = settings.autoScale == "yes" ? true : false;
		
        // Setup main stuff.
        this.setupMainDO();
        this.setupData();
        this.startResize();
    }


    /*
     * Setup main display object.
     */
    setupMainDO(){
        this.mainDO = new FWDDSDisplayObject();
        this.mainDO.screen.className = 'fwdds';
        this.mainDO.style.background = this.backgroundColor;
        this.stageContainer.appendChild(this.mainDO.screen);
    }
    

    /*
     * Resize.
     */
    startResize(){
        window.addEventListener("resize", this.onResize.bind(this));
        this.onResize();
    }

    onResize(e){
        this.resize(e);
    }

    resize(){
	    this.wsw = FWDDSUtils.getViewportSize().w;
		this.wsh = FWDDSUtils.getViewportSize().h;
		this.pageXOffset = FWDDSUtils.getScrollOffsets().x;
		this.pageYOffset = FWDDSUtils.getScrollOffsets().y;

        if(this.displayType == FWDDS.RESPONSIVE){
           
            this.stageContainer.style.width = "100%";
            if(this.stageContainer.offsetWidth > this.maxWidth){
                this.stageContainer.style.width = this.maxWidth + "px";
            }
            this.width = this.stageContainer.offsetWidth;

            if(this.autoScale){
                this.height = Math.round(this.maxHeight * (this.width/this.maxWidth));
                if(this.height < 300) this.height = 300;
            }else{
                this.height = this.maxHeight;
            }

            this.mainDO.x = 0;
            this.mainDO.y = 0;
            this.stageContainer.style.height = this.height  + "px";

            this.scale = Math.min(this.width/this.height, 1);
        }else if(this.displayType == FWDDS.AFTER_PARENT){
            this.width = this.stageContainer.offsetWidth;
			this.height = this.stageContainer.offsetHeight;
        }

        this.mainDO.width = this.width;
		this.mainDO.height = this.height

        if(this.imageManagerDO) this.imageManagerDO.resize(this.width, this.height);
    }


    /*
     * Setup data.
     */
    setupData(){
        this.data = new FWDDSData(this.settings);

        this.onDataError = this.onDataError.bind(this);
        this.data.addEventListener(FWDDSData.ERROR, this.onDataError);

        this.onDataReady = this.onDataReady.bind(this);
        this.data.addEventListener(FWDDSData.READY, this.onDataReady);
    }

    onDataError(e){
        this.errorWindowDO.showText(e.text);
    }

    onDataReady(e){
        if(this.data.hasVideo){
            this.videoDO = new FWDDSVideo(this);
            this.videoDO.style.display = 'none';
            this.mainDO.addChild(this.videoDO);

            //this.onShowUnmute = this.onShowUnmute.bind(this);
            //this.videoDO.addEventListener(FWDDSVideo.SHOW_UNMUTE, this.onShowUnmute);

            //this.onVideoError = this.onVideoError.bind(this);
            //this.videoDO.addEventListener(FWDDSVideo.ERROR, this.onVideoError);
        }
        this.setupImageManager();
        this.resize();
    }

    
    /*
     * Setup imamge manager.
     */
    setupImageManager(){
        this.imageManagerDO = new FWDDSImageManager(this);
        this.mainDO.addChild(this.imageManagerDO);
    }
}