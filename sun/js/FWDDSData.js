/**
 * Distortion Slider PACKAGED v:1.0
 * Data class.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

import FWDDSEventDispather from "./FWDDSEventDispather";
import FWDDSUtils from "./FWDDSUtils";

export default class FWDDSData extends FWDDSEventDispather{
    
    static ERROR = 'error';
    static READY = 'ready';


    /*
     * Initialize
     */
    constructor(settings){
        super();

        this.settings = settings;

        this.parseProperties();
        this.parseGalleryData();
    }


    /*
     * Parse properties.
     */
    parseProperties(){
        this.preloaderRadius = this.settings.preloaderRadius;
        this.preloaderBackgroundColor = this.settings.preloaderBackgroundColor || '#333';
        this.preloaderFillColor = this.settings.preloaderFillColor || '#FFF';
        this.preloaderStrokeSize = this.settings.preloaderStrokeSize || 3;
        this.burnIntensity = this.settings.burnIntensity || 1;
        this.distortionIntensity = this.settings.distortionIntensity || 1;
        this.distortionMouseMoveSensitivity = this.settings.distortionMouseMoveSensitivity || 1;
        this.liquidWavesIntensity = this.settings.liquidWavesIntensity || 1;
        this.liquidWavesIntensity = Math.round(Number(this.liquidWavesIntensity));

        this.liquidWavesSpeed = this.settings.liquidWavesSpeed || 3;
        this.liquidWavesSpeed = Math.round(Number(this.liquidWavesSpeed));
        

        this.randomizeImages = this.settings.randomizeImages || "no";
        this.randomizeImages = this.randomizeImages == "yes" ? true : false;

        this.addMouseMoveDistortion = this.settings.addMouseMoveDistortion || "yes";
        this.addMouseMoveDistortion = this.addMouseMoveDistortion == "yes" ? true : false;  
        
        this.distorted = this.settings.distorted || "no";
        this.distorted = this.distorted == "yes" ? true : false;   

        this.inverseDistortionOnMouseMove = this.settings.inverseDistortionOnMouseMove || "no";
        this.inverseDistortionOnMouseMove = this.inverseDistortionOnMouseMove == "yes" ? true : false;   

        this.aggressiveDistortion = this.settings.aggressiveDistortion || "no";
        this.aggressiveDistortion = this.aggressiveDistortion == "yes" ? true : false;      
        
        this.drag = this.settings.drag || "yes";
        this.drag = this.drag == "yes" ? true : false;  

        this.navigationButtonsBackgroundNormalColor = this.settings.navigationButtonsBackgroundNormalColor || '#FF0000';
        this.navigationButtonsBackgroundSelectedColor = this.settings.navigationButtonsBackgroundSelectedColor || '#00FF00';
        this.navigationButtonsIconNormalColor = this.settings.navigationButtonsIconNormalColor || '#0000FF';
        this.navigationButtonsIconSelectedColor = this.settings.navigationButtonsIconSelectedColor || '#FFFFFF';

    }


    /*
     * Parse gallerdy data.
     */
    parseGalleryData(){
        this.sliderData = [];
        this.hasVideo = false;
		var galleryElement = FWDDSUtils.getChildById(this.settings.sliderDataId);

        if(!galleryElement){
            var error = "Data div with the id <font color='#FF0000'>" + this.settings.sliderDataId + "</font> is not found, please make sure that the container div exsists and the id is correct!";
            setTimeout(function(){
                this.dispatchEvent(FWDDSData.ERROR, {text:error});
            }.bind(this), 1);
            return;
        }

        var curData = FWDDSUtils.getChildren(galleryElement);
        var totalImages = curData.length;

        if(totalImages == 0){
            var error = "At least one image is required in the slider data!";
            setTimeout(function(){
                this.dispatchEvent(FWDDSData.ERROR, {text:error});
            }.bind(this), 1);
            return;
        }
        
        for(var i=0; i<totalImages; i++){
            var obj = {};
            var child = curData[i];
            var test;

            if(!FWDDSUtils.hasAttribute(child, 'data-src')){
                var error = "Attribute <font color='#FF0000'>data-source</font> is not found in the slider data at position nr: <font color='#FF0000'>" + (i + 1) + "</font>.";
                setTimeout(function(){
                    this.dispatchEvent(FWDDSData.ERROR, {text:error});
                }.bind(this), 1);
                return;
            }

            obj.src = String(FWDDSUtils.getAttributeValue(child, "data-src"));
            FWDDSUtils.setMediaType(obj.src, obj);
            
            if(obj.type == 'video'){
                this.hasVideo = true;
            }
           
            
            if(!FWDDSUtils.hasAttribute(child, 'data-width')){
                var error = "Attribute <font color='#FF0000'>data-width</font> is not found in the slider data at position nr: <font color='#FF0000'>" + (i + 1) + "</font>.";
                setTimeout(function(){
                    this.dispatchEvent(FWDDSData.ERROR, {text:error});
                }.bind(this), 1);
                return;
            }

            if(!FWDDSUtils.hasAttribute(child, 'data-height')){
                var error = "Attribute <font color='#FF0000'>data-height</font> is not found in the slider data at position nr: <font color='#FF0000'>" + (i + 1) + "</font>.";
                setTimeout(function(){
                    this.dispatchEvent(FWDDSData.ERROR, {text:error});
                }.bind(this), 1);
                return;
            }

            obj.width = Number(FWDDSUtils.getAttributeValue(child, "data-width"));
            obj.height = Number(FWDDSUtils.getAttributeValue(child, "data-height"));

            this.sliderData.push(obj);
        }
       
        if(this.randomizeImages){
            this.sliderData = FWDDSUtils.randomizeArray(this.sliderData)
        }
        setTimeout(function(){
            this.dispatchEvent(FWDDSData.READY);
        }.bind(this), 1);
      
    }
}