/**
 * Plasmic Audio Player PACKAGED v:1.0
 * Button.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

import FWDDSDisplayObject from "./FWDDSDisplayObject";
import FWDDSUtils from "./FWDDSUtils";

export default class FWDDSButton extends FWDDSDisplayObject{

    static MOUSE_OVER = 'mouseOver';
    static MOUSE_OUT = 'mouseOut';
    static CLICK = 'click';

    /*
     * Initialize
     */
    constructor(
        prt, 
        mainClass,
        icon1,
        icon2,
        backgroundNormalColor,
        backgroundSelectedColor,
        iconNormalColor,
        iconSelectedColor,
        setupDumy,
        showSecondIconOnHover
    ){

        super();

        this.prt = prt;
        this.icon1 = icon1;
        this.icon2 = icon2;
        this.backgroundNormalColor = backgroundNormalColor;
        this.backgroundSelectedColor = backgroundSelectedColor;
        this.iconNormalColor = iconNormalColor;
        this.iconSelectedColor = iconSelectedColor;
        this._state = 0;
        this.isMobile = FWDDSUtils.isMobile;
        this.showSecondIconOnHover = showSecondIconOnHover;

        this.screen.className = mainClass;
        this.style.overflow = 'visible';
        this.btn1 = new FWDDSDisplayObject();
       
        // Setup stuff.
        this.setupButtons();
        this.addEvents();
        this.setNormalState();

        this.enable();
        this._state = 0;
       
        if(setupDumy != undefined){
            this.setupDumy();
        }
    }


    /**
     * Setup buttons.
     */
    setupButtons(){

       
        // Buttons holder.
        this.buttonsHolderDO =  new FWDDSDisplayObject();
        this.buttonsHolderDO.style.width = '100%';
        this.buttonsHolderDO.style.height = '100%';
        this.buttonsHolderDO.screen.className = 'fwdpap-button-holder';
        this.addChild(this.buttonsHolderDO);

        // First button.
        this.btn1DO = new FWDDSDisplayObject();
        this.btn1DO.screen.className = 'fwdpap-first-button';
        this.btn1DO.style.width = '100%';
        this.btn1DO.style.height = '100%';
        this.btn1DO.style.pointerEvents = "none";
        this.btn1DO.innerHTML = '<span class="' + this.icon1 + '"</span>'
        this.buttonsHolderDO.addChild(this.btn1DO);

        // Second button.
        if(this.icon2){
            this.btn2DO = new FWDDSDisplayObject();
            this.btn2DO.screen.className = 'fwdpap-second-button';
            this.btn2DO.style.width = '100%';
            this.btn2DO.style.height = '100%';
            this.btn2DO.style.pointerEvents = "none";
            this.btn2DO.innerHTML = '<span class="' + this.icon2 + '"</span>'
            this.buttonsHolderDO.addChild(this.btn2DO);
            this.state = 0;
        }
    }

    /**
     * Setup dumy,
     */
    setupDumy(){
        this.dummyDO =  new FWDDSDisplayObject();	
        this.dummyDO.style.width = '100%';
        this.dummyDO.style.pointerEvents = 'none';
        this.addChild(this.dummyDO);

        this.setDumyPositionTO = setTimeout(()=>{
            if(this.destroyed) return;
            this.dummyDO.height = 20 + this.height;
            this.dummyDO.y = -this.dummyDO.height + this.height + 10;
        }, 100);
    }


    /**
     * Add events.
     */
    addEvents(){
        if(this.isMobile){
            this.onMouseUp = this.onMouseUp.bind(this);
			this.screen.addEventListener("touchend", this.onMouseUp);
        }else{
            this.onMouseOver = this.onMouseOver.bind(this);
            this.screen.addEventListener("mouseover", this.onMouseOver);

            this.onMouseOut = this.onMouseOut.bind(this);
			this.screen.addEventListener("mouseout", this.onMouseOut);

            this.onMouseUp = this.onMouseUp.bind(this);
			this.screen.addEventListener("mouseup", this.onMouseUp);
        }
    }

    onMouseOver(e){
        if(!e.pointerType || e.pointerType == e.MSPOINTER_TYPE_MOUSE){
            if(this.isDisabled) return;
            this.setSelectedState(true);
            this.dispatchEvent(FWDDSButton.MOUSE_OVER, {e:e});
           
        }
    }
    
    onMouseOut(e){
        if(!e.pointerType || e.pointerType == e.MSPOINTER_TYPE_MOUSE){
            if(this.isDisabled) return;
            this.setNormalState(true);
            this.dispatchEvent(FWDDSButton.MOUSE_OUT, {e:e});
        }
    }

    onMouseUp(e){
        if(e.preventDefault) e.preventDefault();
        this.dispatchEvent(FWDDSButton.CLICK , {e:e});
       
    }


    /**
     * Set buttons states.
     */
    setNormalState(animate){
        
        this.isSelected = false;
        if(animate){
            FWDAnimation.to(this.btn1DO.screen, 1, {backgroundColor:this.backgroundNormalColor, color:this.iconNormalColor, ease:Quint.easeOut});
            if(this.btn2DO){
                let opacity = 1;
                if(this.showSecondIconOnHover){
                    opacity = 0;
                }
                FWDAnimation.to(this.btn2DO.screen, 1, {backgroundColor:this.backgroundNormalColor, color:this.iconNormalColor, opacity:opacity, ease:Quint.easeOut });
            }
        }else{
            this.btn1DO.style.backgroundColor = this.backgroundNormalColor;
            this.btn1DO.style.color = this.iconNormalColor;

            if(this.btn2DO){
                this.btn2DO.style.backgroundColor = this.backgroundNormalColor;
                this.btn2DO.style.color = this.iconNormalColor;
            }
        }
    }

    setSelectedState(animate){
      
        this.isSelected = true;
        if(animate){
          

            FWDAnimation.to(this.btn1DO.screen, 1, {backgroundColor:this.backgroundSelectedColor, color:this.iconSelectedColor, ease:Quint.easeOut });

            if(this.btn2DO){
                FWDAnimation.to(this.btn2DO.screen, 1, {backgroundColor:this.backgroundSelectedColor, color:this.iconSelectedColor, opacity:1,  ease:Quint.easeOut });
            }
        }else{
            this.btn1DO.style.backgroundColor = this.backgroundSelectedColor;
            this.btn1DO.style.color = this.iconSelectedColor

            if(this.btn2DO){
                this.btn2DO.style.backgroundColor = this.backgroundSelectedColor;
                this.btn2DO.style.color = this.iconSelectedColor;
            }
        }
    }


    /**
     * Set state.
     */
    set state(state){

        if(this.showSecondIconOnHover){
            this.btn2DO.opacity = 0;
            return;
        }
        
        this._state = state;
       
        if(this._state == 0){
            this.btn1DO.style.display = 'none';
            this.btn2DO.style.display = 'block';
           
        }else{
            this.btn1DO.style.display = 'block';
            this.btn2DO.style.display = 'none'
        }
    }

    get state(){
        return this._state;
    }


    /**
     * Enable / disable.
     */
    enable(){
        this.style.pointerEvents = 'auto';
        this.style.cursor = 'pointer';
    }

    disable(){
        this.style.pointerEvents = 'none';
        this.style.cursor = 'auto';;
    }

    /**
     * Update colors.
     */
    updateColors(normalColor, selectedColor){
      
        if(normalColor){
            this.iconNormalColor = normalColor;

            if(!this.isSelected){
                this.btn1DO.style.color = this.iconNormalColor

                if(this.btn2DO){
                    this.btn2DO.style.color = this.iconNormalColor;
                }
            }
        }
      
        if(selectedColor){
            this.iconSelectedColor = selectedColor;
            if(this.isSelected){
                this.btn1DO.style.color = this.iconSelectedColor

                if(this.btn2DO){
                    this.btn2DO.style.color = this.iconSelectedColor;
                }
            }
        }
    }

     /**
     *  Destroy.
     */
     destroy(){
        this.destroyed = true;
    }
}